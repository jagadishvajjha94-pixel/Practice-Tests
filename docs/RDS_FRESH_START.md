# Fresh AWS RDS — automatic tables (no Supabase, no manual SQL)

> **Full step-by-step from zero:** see **[DEPLOY_RDS_FROM_SCRATCH.md](./DEPLOY_RDS_FROM_SCRATCH.md)** (recommended starting point).

# Fresh AWS RDS — automatic tables (no Supabase, no manual SQL)

For a **new empty RDS** database you do **not** need:

- Supabase migration scripts  
- Manual `CREATE TABLE` in SQL editors  
- Copying old Supabase data  

Tables and columns are created **automatically** from `prisma/schema.prisma`.

---

## Automatic schema (default ON)

When these are set:

```env
USE_AWS_STACK=true
AUTO_RDS_SCHEMA=true   # default; set false only to disable
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

The app will run **`prisma db push`** automatically:

| Trigger | When |
|---------|------|
| Server start | `instrumentation.ts` on each Vercel/Node instance |
| `/api/health` | First health check |
| Login / API | Before auth and protected APIs |

So after you deploy to Vercel with a valid `DATABASE_URL`, the **first visit** (or health check) creates all tables and columns.

---

## Minimum steps for Vercel trial

### 1. AWS RDS

- PostgreSQL 15+, database name `prepindia`  
- **Public access: Yes** (required for Vercel)  
- Security group: allow **5432** from internet (trial) or Vercel IPs  

### 2. Vercel environment variables

Copy from [`.env.vercel-rds.example`](../.env.vercel-rds.example):

```env
USE_AWS_STACK=true
USE_PRISMA_AUTH=true
NEXT_PUBLIC_USE_AWS_STACK=true
AUTO_RDS_SCHEMA=true

DATABASE_URL=postgresql://USER:PASS@your-db.region.rds.amazonaws.com:5432/prepindia?sslmode=require&connection_limit=1
DIRECT_URL=postgresql://USER:PASS@your-db.region.rds.amazonaws.com:5432/prepindia?sslmode=require

AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://YOUR-APP.vercel.app
AUTH_TRUST_HOST=true
NEXT_PUBLIC_APP_URL=https://YOUR-APP.vercel.app

PREPINDIA_ADMIN_EMAIL=admin@rce.ac.in
PREPINDIA_ADMIN_PASSWORD=YourSecurePassword
NEXT_PUBLIC_SIGNUP_DISABLED=true
```

Do **not** set Supabase variables.

### 3. Deploy

Push to GitHub or redeploy in Vercel.

Recommended **Build Command** (schema + app):

```bash
prisma generate && prisma db push --accept-data-loss && next build
```

This applies schema at deploy time even if the first API auto-sync is slow.

### 4. First request creates schema

Open either:

- `https://YOUR-APP.vercel.app/api/health`  
- `https://YOUR-APP.vercel.app/setup`  

Tables/columns are created automatically if missing.

### 5. One-time: admin + sample data

Tables alone are not enough for a demo — you need an admin user and tests.

**Option A — Setup page (easiest)**  
Open `https://YOUR-APP.vercel.app/setup` → **Start Setup**  
Creates admin + sample categories/tests.

**Option B — Local (optional)**

```bash
pnpm install
pnpm init:rds
```

### 6. Log in

- Admin: `https://YOUR-APP.vercel.app/auth/login/admin`  
- Students: `/auth/login/student` (after you add users or roster)

---

## Verify

```bash
curl https://YOUR-APP.vercel.app/api/health
```

Expected:

```json
{
  "status": "healthy",
  "checks": {
    "app": "ok",
    "auth_mode": "prisma_jwt",
    "schema_auto_sync": "ok",
    "database": "ok"
  }
}
```

```bash
curl https://YOUR-APP.vercel.app/api/setup/rds
```

After setup: `"schemaReady": true`, `"categoryCount" > 0`.

---

## What gets created automatically

Everything in `prisma/schema.prisma`, including:

- `users`, `admin_users`, `test_categories`, `tests`, `questions`  
- `test_attempts`, `exam_schedules`, `faculty_exam_requests`  
- `evalora_module_schedules`, `exam_slot_roster_entries`, `rmset_papers`  
- Proctoring, sessions, department groups, etc.  

New columns added to the schema are applied on the next auto-sync (or deploy).

---

## Optional: disable auto schema

```env
AUTO_RDS_SCHEMA=false
```

Then run manually: `pnpm init:rds` or `/setup` only.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `schema_auto_sync: failed` | Check RDS public access, security group, `DATABASE_URL`, `sslmode=require` |
| `database` error after sync | Wrong password or RDS not reachable from Vercel |
| Admin login fails | Run `/setup` once or set `PREPINDIA_ADMIN_*` and POST `/api/setup/rds` |
| Empty exam list | Run `/setup` to seed sample categories/tests |

---

## Summary

1. Point Vercel at empty RDS with `USE_AWS_STACK=true`.  
2. Deploy — **tables/columns auto-create** on first request.  
3. Open `/setup` once for admin + sample data.  
4. Run your student trial.
