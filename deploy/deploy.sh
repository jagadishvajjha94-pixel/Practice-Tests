#!/usr/bin/env bash
# Deploy PrepIndia web app on EC2 (run from apps/prepindia-web after git pull)
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo "▶ Installing dependencies..."
pnpm install --frozen-lockfile

echo "▶ Generating Prisma client..."
pnpm exec prisma generate

echo "▶ Running database migrations..."
pnpm db:migrate 2>/dev/null || pnpm db:push

echo "▶ Building Next.js..."
pnpm build

echo "▶ Reloading PM2..."
pm2 reload deploy/ecosystem.config.cjs --env production || pm2 start deploy/ecosystem.config.cjs --env production

echo "▶ Health check..."
sleep 3
curl -sf http://127.0.0.1:3000/api/health | head -c 500
echo ""
echo "✅ Deploy complete"
