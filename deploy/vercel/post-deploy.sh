#!/usr/bin/env bash
# Smoke-test a Vercel + RDS deployment after env is configured.
# Usage: ./deploy/vercel/post-deploy.sh https://your-app.vercel.app

set -euo pipefail

BASE="${1:-}"
if [[ -z "$BASE" ]]; then
  echo "Usage: $0 https://your-app.vercel.app"
  exit 1
fi

BASE="${BASE%/}"

echo "▶ Health: $BASE/api/health"
curl -sf "$BASE/api/health" | head -c 800
echo -e "\n"

echo "▶ RDS setup status: $BASE/api/setup/rds"
curl -sf "$BASE/api/setup/rds" | head -c 800
echo -e "\n"

echo "✅ If status is healthy and schemaReady is true, open $BASE/setup then /auth/login/admin"
