#!/usr/bin/env bash
# Publish a clean copy of this app to the public repo, and prove the copy is clean twice.
#   1. export the tree without git state, env files, vercel state or node_modules
#   2. run the open-source gate on the export; any hit stops everything
#   3. commit the export on top of the public repo's history and push
#   4. clone the public repo back and run the gate on what the world sees
# Usage: bash scripts/publish-open.sh "commit message"
set -u
export PATH="$HOME/.local/bin:$PATH"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
PUB_URL="${GRATUS_PUBLIC_REPO:-https://github.com/InitiumBuilders/Gratus.CC-Open.git}"
MSG="${1:-open source sync}"
OUT="$(mktemp -d)"; CB="$(mktemp -d)"
trap 'rm -rf "$OUT" "$CB"' EXIT

rsync -a --delete --exclude .git --exclude .vercel --exclude node_modules --exclude '.env*' --exclude '*.log' --exclude .decoys "$SRC"/ "$OUT"/
echo "== open-source gate on the export"
node "$OUT/scripts/gates/open-source.mjs" "$OUT" || { echo "PUBLISH STOPPED: the export is not clean"; exit 1; }

cd "$OUT" || exit 1
git init -q -b main
git add -A
git -c user.name="Gratus.CC" -c user.email="hello@gratus.cc" commit -q -m "$MSG"
git remote add origin "$PUB_URL"
if git fetch -q origin main 2>/dev/null; then
  git reset -q --soft origin/main
  if git -c user.name="Gratus.CC" -c user.email="hello@gratus.cc" commit -q -m "$MSG" 2>/dev/null; then echo "== commit on top of public history"; else echo "== public repo already matches; nothing to push"; exit 0; fi
fi
git push -q origin HEAD:main || { echo "PUBLISH FAILED: push refused"; exit 1; }
echo "== pushed $(git rev-parse --short HEAD) → $PUB_URL"

echo "== clone-back gate"
git clone -q --depth 1 "$PUB_URL" "$CB/x" || { echo "CLONE-BACK FAILED"; exit 1; }
node "$CB/x/scripts/gates/open-source.mjs" "$CB/x" || { echo "CLONE-BACK GATE: BLOCK · the public copy has a hit; fix and republish now"; exit 1; }
echo "== public copy is clean: $(cd "$CB/x" && git rev-parse --short HEAD)"
