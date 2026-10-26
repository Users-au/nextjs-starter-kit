#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Use patched Node.js 24.22.1+ or 22.23.4+. See .nvmrc."
  exit 1
fi
node scripts/check-runtime.mjs
npm ci
node scripts/setup-env.mjs
echo "Register /auth/usersau/callback under your public app origin, configure .env.local, then run npm run dev."
