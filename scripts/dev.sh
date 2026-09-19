#!/usr/bin/env bash
# Local runner (WSL). Usage: scripts/dev.sh test | gates | contrast | banned | icons | deploy
set -u
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$PATH"
case "${1:-test}" in
  test)     node --test scripts/tests/*.test.mjs ;;
  contrast) node scripts/gates/contrast.mjs ;;
  banned)   node scripts/gates/banned.mjs ;;
  gates)    node --test scripts/tests/*.test.mjs && node scripts/gates/contrast.mjs && node scripts/gates/banned.mjs ;;
  icons)    python3 scripts/icons.py ;;
  deploy)   vercel deploy --prod --yes 2>&1 | tail -8 ;;
  *)        echo "unknown: $1"; exit 2 ;;
esac
