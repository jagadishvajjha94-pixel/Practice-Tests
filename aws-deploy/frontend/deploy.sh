#!/usr/bin/env bash
# Deploy PrepIndia FRONTEND on EC2 (Next.js UI) — port 3000
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo "▶ PrepIndia frontend deploy (port 3000)"
echo "▶ Installing dependencies..."
pnpm install --frozen-lockfile

echo "▶ Building Next.js..."
pnpm build

echo "▶ Reloading PM2..."
pm2 reload deploy/ecosystem.config.cjs --env production 2>/dev/null \
  || pm2 start deploy/ecosystem.config.cjs --env production

echo "▶ Health check..."
sleep 3
curl -sf http://127.0.0.1:3000/api/health | head -c 500 || curl -sfI http://127.0.0.1:3000/ | head -n 3
echo ""
echo "✅ Frontend deploy complete — UI on port 3000"
