#!/usr/bin/env bash
# One-time: link the folder to the Vercel project gratus-in-motus and create its Blob store.
set -u
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$PATH"
echo "== link"; vercel link --yes --project gratus-in-motus 2>&1 | tail -4
echo "== store"; vercel blob create-store gratus-data 2>&1 | tail -6
echo "== stores"; vercel blob list-stores 2>&1 | grep -i gratus
echo "== env"; vercel env ls 2>&1 | tail -6
