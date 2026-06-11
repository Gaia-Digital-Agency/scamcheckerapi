#!/usr/bin/env bash
# Auto-deploy on gda-s01. Run by GitHub Actions on push to main (also runnable by hand).
set -euo pipefail
cd /var/www/scamcheckerapi

echo "→ fetching latest"
git fetch --all --prune
git reset --hard origin/main

echo "→ installing deps"
npm install --no-audit --no-fund

echo "→ building"
npm run build

echo "→ migrating"
npm run migrate

echo "→ restarting"
pm2 restart scamcheckerapi --update-env

echo "✓ deployed $(git rev-parse --short HEAD) at $(date '+%Y-%m-%d %H:%M:%S %Z')"
