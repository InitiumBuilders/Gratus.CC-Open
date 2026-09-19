#!/usr/bin/env bash
# Inspect / create the Blob store for gratus-in-motus (WSL). Usage: scripts/vercel-blob.sh [create|list|help]
set -u
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$PATH"
case "${1:-list}" in
  help)   vercel blob create-store --help 2>&1 | grep -v '^$' | head -40 ;;
  create) vercel blob create-store gratus-data 2>&1 | grep -v '^$' | tail -20 ;;
  list)   echo "== connected"; vercel blob list-stores 2>&1 | tail -5; echo "== all"; vercel blob list-stores --all 2>&1 | grep -i -E 'gratus|Name' ;;
  env)    vercel env ls 2>&1 | tail -8 ;;
  project) cat .vercel/project.json; echo; vercel whoami 2>&1 | tail -1 ;;
  *) echo "unknown"; exit 2 ;;
esac
