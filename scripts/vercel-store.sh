#!/usr/bin/env bash
# Create + connect the Blob store, and set the two server secrets. Idempotent-ish; safe to re-run.
set -u
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$PATH"
echo "== create + connect store"
vercel blob create-store gratus-data --access public --yes --environment production --environment preview --environment development 2>&1 | grep -v '^$' | tail -8
echo "== salt + cron secret"
SALT="$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 40)"
CRON="$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 40)"
for ENVN in production preview development; do
  printf '%s' "$SALT" | vercel env add GRATUS_SALT "$ENVN" 2>&1 | tail -1
  printf '%s' "$CRON" | vercel env add CRON_SECRET "$ENVN" 2>&1 | tail -1
done
echo "== env"
vercel env ls 2>&1 | tail -12
