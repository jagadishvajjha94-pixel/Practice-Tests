# AWS Migration Guide — PrepIndia Exam Platform

Production migration from Supabase to **EC2 + ALB + RDS PostgreSQL + S3 + CloudFront + NextAuth JWT + Prisma**.

## Architecture

```
                    ┌─────────────────┐
                    │   CloudFront    │  (static / optional CDN)
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Application    │
                    │  Load Balancer  │  HTTPS, health: /api/health
                    └────────┬────────┘
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
       │  EC2 #1     │ │  EC2 #2    │ │  EC2 #N    │
       │ NGINX:80    │ │ NGINX:80   │ │ NGINX:80   │
       │ PM2 cluster │ │ PM2 cluster│ │ PM2 cluster│
       │ Next.js     │ │ Next.js    │ │ Next.js    │
       └──────┬──────┘ └─────┬──────┘ └─────┬──────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │   RDS PostgreSQL            │
              │   (+ RDS Proxy pooling)     │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │   S3 (proctor screenshots)  │
              └─────────────────────────────┘

Auth: NextAuth JWT (stateless — no server memory sessions)
ORM: Prisma
Flag: USE_AWS_STACK=true
```

## Capacity target

| Metric | Design |
|--------|--------|
| Concurrent students | 500 |
| Exam autosave | Client state + local draft 30s + server autosave 3 min |
| Final submit | Once per attempt |
| DB writes | Minimized — no per-click saves |
| Session | JWT cookies — works across EC2 instances |
| Rate limit | In-memory (single node) → **ElastiCache Redis** for multi-EC2 |

## Step-by-step migration order

### Phase 0 — AWS infrastructure

1. **VPC** — public subnets (ALB), private subnets (RDS, EC2)
2. **RDS PostgreSQL 15+** — `db.t4g.medium` minimum for 500 users; enable Multi-AZ
3. **RDS Proxy** — connection pooling for PM2 cluster + multiple EC2
4. **S3 bucket** — `prepindia-exam-proctoring`, block public access, SSE-S3
5. **IAM** — EC2 instance role: `s3:PutObject`, `s3:GetObject` on bucket
6. **ALB** — target group health check `GET /api/health`, stickiness **disabled** (JWT stateless)
7. **CloudFront** (optional) — cache `/_next/static/*`
8. **EC2** — Amazon Linux 2023, t3.large × 2 (autoscaling group min 2, max 6)

### Phase 1 — Database

```bash
cd apps/prepindia-web
cp .env.aws.example .env.production
# Edit DATABASE_URL, DIRECT_URL, AUTH_SECRET

pnpm install
pnpm db:push          # or pnpm db:migrate after first migration
pnpm bootstrap:admin:aws
```

### Phase 2 — Data migration from Supabase

```bash
# In .env.local add:
# SUPABASE_DATABASE_URL=postgresql://postgres:...@db.xxx.supabase.co:5432/postgres
# MIGRATION_DEFAULT_PASSWORD=TempPass@2025  # students reset on first login

node scripts/migrate-supabase-to-rds.mjs --dry-run
node scripts/migrate-supabase-to-rds.mjs
```

### Phase 3 — Enable AWS stack (canary)

On one EC2 instance:

```bash
USE_AWS_STACK=true
USE_PRISMA_AUTH=true
# Remove or comment Supabase env vars
pm2 restart all
```

Verify:
- `GET /api/health` → `"auth_mode":"prisma_jwt"`, `"database":"ok"`
- Admin login `/auth/login/admin`
- Student login + exam take + autosave
- Proctor screenshot upload via S3 presigned URL

### Phase 4 — Remove Supabase

After 48h stable production:

1. Remove `@supabase/ssr`, `@supabase/supabase-js` from `package.json`
2. Delete `lib/supabase*.ts`, `proxy.ts` Supabase branch
3. Refactor remaining ~150 files still calling Supabase (see file list below)

## EC2 setup

```bash
# Node 20 LTS
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs nginx git

# App
sudo mkdir -p /var/log/prepindia /opt/prepindia
cd /opt/prepindia && git clone <repo> .
cd apps/prepindia-web
pnpm install --frozen-lockfile
pnpm build

# PM2
sudo npm i -g pm2
pm2 start deploy/ecosystem.config.cjs --env production
pm2 save && pm2 startup

# NGINX
sudo cp deploy/nginx.conf /etc/nginx/conf.d/prepindia.conf
sudo nginx -t && sudo systemctl reload nginx
```

## Environment variables

See [`.env.aws.example`](../../.env.aws.example).

| Variable | Purpose |
|----------|---------|
| `USE_AWS_STACK` | Master feature flag |
| `DATABASE_URL` | RDS via Proxy (pooled) |
| `DIRECT_URL` | Direct RDS for migrations |
| `AUTH_SECRET` | NextAuth JWT signing |
| `AWS_S3_BUCKET` | Proctor screenshots |
| `AUTH_URL` | Public app URL |

## Files modified in this migration

| Area | Files |
|------|-------|
| Auth | `auth.ts`, `lib/auth/*`, `app/api/auth/*/signin`, `proxy.ts` |
| DB | `prisma/schema.prisma`, `lib/prisma.ts`, `lib/roles-prisma.ts` |
| Storage | `lib/aws/s3.ts`, `app/api/storage/proctor-upload` |
| Exam | `hooks/use-exam-autosave.ts`, `app/api/exam/attempts/*/autosave` |
| Ops | `deploy/*`, `load-tests/k6-exam-load.js`, `app/api/health` |
| Scripts | `scripts/bootstrap-admin-aws.mjs`, `scripts/migrate-supabase-to-rds.mjs` |

## Remaining Supabase refactor (incremental)

High-traffic paths to migrate next:

- `app/tests/take/[testId]/test-interface.tsx` — exam submit/progress
- `lib/admin/*` — dashboard, reports
- `lib/question-bank/seed-curated-bank.ts` — Prisma inserts
- `hooks/use-exam-proctoring.ts` — S3 screenshot upload
- `components/auth/use-student-sign-in.ts` — remove Supabase env check when AWS-only

Pattern for API routes:

```typescript
import { requireAuth } from '@/lib/server-auth';
import { useAwsStack } from '@/lib/aws/stack';
import { getPrismaDb } from '@/lib/server-auth-prisma';

const auth = await requireAuth(['admin'], request);
if ('response' in auth) return auth.response;

if (useAwsStack()) {
  const db = getPrismaDb();
  // prisma queries...
} else {
  const supabase = auth.ctx.supabase!;
  // legacy supabase...
}
```

## Deployment verification

1. `curl -s https://exam.example.com/api/health | jq`
2. Admin login → dashboard loads < 3s
3. Start exam → answer 5 MCQs → wait 3 min → verify autosave in RDS `test_attempts.answers`
4. Submit exam → result page
5. k6: `k6 run load-tests/k6-exam-load.js -e BASE_URL=...`

## Security checklist

- [ ] `AUTH_SECRET` rotated, 32+ bytes
- [ ] RDS in private subnet, security group EC2-only
- [ ] S3 bucket policy denies public read
- [ ] ALB HTTPS only, HSTS header
- [ ] Rate limiting via Redis before exam day
- [ ] `MIGRATION_DEFAULT_PASSWORD` removed after student password reset campaign
