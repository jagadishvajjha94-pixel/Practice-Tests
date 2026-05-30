#!/usr/bin/env bash
# Deploy PrepIndia BACKEND on EC2 (API + Prisma + RDS) — port 3001
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo "▶ PrepIndia backend deploy (port 3001)"
echo "▶ Installing dependencies..."
pnpm install --frozen-lockfile

echo "▶ Generating Prisma client..."
pnpm exec prisma generate

echo "▶ Syncing RDS schema..."
pnpm db:migrate 2>/dev/null || pnpm db:push

echo "▶ Building Next.js..."
pnpm build

echo "▶ Reloading PM2..."
pm2 reload deploy/ecosystem.config.cjs --env production 2>/dev/null \
  || pm2 start deploy/ecosystem.config.cjs --env production

echo "▶ Health check..."
sleep 3
curl -sf http://127.0.0.1:3001/api/health | head -c 500
echo ""
echo "✅ Backend deploy complete — API on port 3001"
