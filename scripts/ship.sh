#!/usr/bin/env bash
# Ship: gates, then commit, then deploy to production, then probe the live URL.
# Never deploys on a red gate. Five gates now: the tests, contrast, banned words,
# slop (my prose only, never his), and the open-source scrub. The two that can
# rot silently, slop and open-source, prove themselves against decoys first.
set -u
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$PATH"
echo "== gates"
node --test scripts/tests/*.test.mjs > /tmp/gratus-tests.log 2>&1; T=$?
node scripts/gates/contrast.mjs | tail -1; C=${PIPESTATUS[0]}
node scripts/gates/banned.mjs | tail -1; B=${PIPESTATUS[0]}
node scripts/gates/slop.mjs | tail -1; S=${PIPESTATUS[0]}
node --import ./scripts/gates/lib/loader.mjs scripts/gates/integrity.mjs | tail -1; I=${PIPESTATUS[0]}
grep -E '^# (pass|fail)' /tmp/gratus-tests.log
if [ "$T" != "0" ] || [ "$C" != "0" ] || [ "$B" != "0" ] || [ "$S" != "0" ] || [ "$I" != "0" ]; then echo "GATES RED, not shipping"; exit 1; fi
echo "== decoys first: a gate that has stopped biting is worse than no gate"
node scripts/gates/slop.mjs --decoy || { echo "SLOP GATE CANNOT BE TRUSTED, not shipping"; exit 1; }
node scripts/gates/open-source.mjs . --decoy || { echo "GATE CANNOT BE TRUSTED, not shipping"; exit 1; }
echo "== stamp entry scripts (a returning browser must never keep an old app.js)"
STAMP="$(date +%s)"
sed -i -E "s#galaxy\.js\?v=[0-9a-z]+#galaxy.js?v=${STAMP}#g" app.html sw.js
sed -i -E "s#const V = 'gratus-[0-9a-z]+'#const V = 'gratus-${STAMP}'#" sw.js
echo "stamp ${STAMP}"
echo "== commit"
git add -A >/dev/null 2>&1
git commit -q -m "${1:-ship}" 2>/dev/null && git log --oneline -1 || echo "(nothing new to commit)"
echo "== preview env (idempotent)"
for K in GRATUS_SALT CRON_SECRET; do vercel env ls 2>/dev/null | grep -q "$K.*Preview" || { vercel env pull /tmp/gratus-env.txt --environment production >/dev/null 2>&1; V="$(grep "^$K=" /tmp/gratus-env.txt | cut -d= -f2- | tr -d '"')"; [ -n "$V" ] && printf '%s' "$V" | vercel env add "$K" preview >/dev/null 2>&1 && echo "added $K to preview"; }; done
rm -f /tmp/gratus-env.txt
echo "== deploy"
command -v vercel >/dev/null 2>&1 || { echo "DEPLOY FAILED: vercel is not on PATH (run ship.sh from a login shell)"; exit 1; }
vercel deploy --prod --yes 2>&1 | tail -6
echo "== probe"
for P in / /app /app/give /gift /privacy /terms /manifest.webmanifest /sw.js; do printf '%-24s ' "$P"; curl -s -o /dev/null -w '%{http_code} %{size_download}B\n' "https://gratus-in-motus.vercel.app$P"; done
echo "== refute: is the LIVE entry script the one we just stamped?"
# the alias settles a few seconds after "Ready"; ask up to eight times before calling it a failure
for TRY in 1 2 3 4 5 6 7 8; do
  LIVE="$(curl -s "https://gratus-in-motus.vercel.app/app.html?probe=${STAMP}-${TRY}" | grep -o 'galaxy\.js?v=[0-9]*' | head -1)"
  [ "$LIVE" = "galaxy.js?v=${STAMP}" ] && break; sleep 5
done
if [ "$LIVE" = "galaxy.js?v=${STAMP}" ]; then echo "LIVE STAMP MATCHES: ${LIVE} (try ${TRY})"; else echo "DEPLOY DID NOT LAND: live=${LIVE:-none} local=galaxy.js?v=${STAMP}"; exit 1; fi
echo "== public mirror"
bash scripts/publish-open.sh "${1:-ship}" || { echo "PUBLIC MIRROR NOT UPDATED (the live deploy stands; fix the hit and run scripts/publish-open.sh)"; exit 1; }
