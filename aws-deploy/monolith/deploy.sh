#!/usr/bin/env bash
# Deploy PrepIndia MONOLITH on EC2 (UI + API together) — port 3000
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo "▶ PrepIndia monolith deploy (port 3000)"
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm db:migrate 2>/dev/null || pnpm db:push
pnpm build
pm2 reload deploy/ecosystem.config.cjs --env production 2>/dev/null \
  || pm2 start deploy/ecosystem.config.cjs --env production
sleep 3
curl -sf http://127.0.0.1:3000/api/health | head -c 500
echo ""
echo "✅ Monolith deploy complete"
