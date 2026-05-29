# Vercel + AWS RDS deployment files

This folder documents the **Vercel + AWS** deployment layout for PrepIndia.

## Root files (used by Vercel automatically)

| File | Purpose |
|------|---------|
| [`vercel.json`](../../vercel.json) | Build command, Mumbai region, API timeouts, AWS env defaults |
| [`.vercelignore`](../../.vercelignore) | Files excluded from upload |
| [`.env.vercel-rds.example`](../../.env.vercel-rds.example) | Copy values into Vercel Dashboard |
| [`scripts/vercel-build.mjs`](../../scripts/vercel-build.mjs) | `prisma generate` → `db push` → `next build` |

## Scripts

```bash
# Check env before deploy (local .env.local)
node scripts/verify-vercel-aws-env.mjs

# Same build Vercel runs
pnpm run vercel-build

# Fresh RDS from your PC
pnpm run init:rds
```

## Vercel Dashboard secrets (you must set manually)

Secrets are **not** stored in git. Add in **Vercel → Settings → Environment Variables**:

See [`required-env.json`](./required-env.json) and [`.env.production.example`](./.env.production.example).

## Full guide

[docs/DEPLOY_RDS_FROM_SCRATCH.md](../../docs/DEPLOY_RDS_FROM_SCRATCH.md)
