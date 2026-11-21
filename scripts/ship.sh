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
node scripts/gates/thehand.mjs | tail -1; H=${PIPESTATUS[0]}
node --import ./scripts/gates/lib/loader.mjs scripts/gates/account.mjs | tail -1; A=${PIPESTATUS[0]}
grep -E '^# (pass|fail)' /tmp/gratus-tests.log
if [ "$T" != "0" ] || [ "$C" != "0" ] || [ "$B" != "0" ] || [ "$S" != "0" ] || [ "$I" != "0" ] || [ "$H" != "0" ] || [ "$A" != "0" ]; then echo "GATES RED, not shipping"; exit 1; fi
echo "== decoys first: a gate that has stopped biting is worse than no gate"
node scripts/gates/slop.mjs --decoy || { echo "SLOP GATE CANNOT BE TRUSTED, not shipping"; exit 1; }
node scripts/gates/open-source.mjs . --decoy || { echo "GATE CANNOT BE TRUSTED, not shipping"; exit 1; }
echo "== nothing private in what gets deployed (the whole tree is served)"
[ -e .private-names ] && { echo "A PRIVATE LIST IS IN THE TREE, not shipping"; exit 1; }
echo "== stamp entry scripts (a returning browser must never keep an old app.js)"
STAMP="$(date +%s)"
sed -i -E "s#galaxy\.js\?v=[0-9a-z]+#galaxy.js?v=${STAMP}#g" app.html sw.js
sed -i -E "s#const V = 'gratus-[0-9a-z]+'#const V = 'gratus-${STAMP}'#" sw.js
# the four shared pages are struck from app.html, so they are struck again and carry the same stamp
python3 scripts/shells.py >/dev/null || { echo "THE SHARED PAGES WERE NOT WRITTEN, not shipping"; exit 1; }
STALE="$(grep -L -F "galaxy.js?v=${STAMP}" app.html gift.html p.html passage.html guided.html)"
[ -n "$STALE" ] && { echo "AN ENTRY PAGE KEPT AN OLD STAMP: $STALE, not shipping"; exit 1; }
echo "stamp ${STAMP}, on app.html and the four shared pages"
echo "== commit"
git add -A >/dev/null 2>&1
git commit -q -m "${1:-ship}" 2>/dev/null && git log --oneline -1 || echo "(nothing new to commit)"
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
GIFT="$(curl -s "https://gratus-in-motus.vercel.app/gift?probe=${STAMP}" | grep -o 'galaxy\.js?v=[0-9]*' | head -1)"
if [ "$GIFT" = "galaxy.js?v=${STAMP}" ]; then echo "the gift page carries it too"; else echo "THE GIFT PAGE DID NOT LAND: ${GIFT:-none} (the deploy stands; check gift.html)"; exit 1; fi
echo "== refute: does the live site answer for a private file?"
for P in /.env /.env.local /.vercel/project.json /.private-names; do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "https://gratus-in-motus.vercel.app$P")"
  [ "$CODE" = "200" ] && { echo "PRIVATE FILE SERVED: $P. Take the deployment down and rotate what the file held"; exit 1; }
done
echo "none of the four is served"
echo "== public mirror"
bash scripts/publish-open.sh "${1:-ship}" || { echo "PUBLIC MIRROR NOT UPDATED (the live deploy stands; fix the hit and run scripts/publish-open.sh)"; exit 1; }
