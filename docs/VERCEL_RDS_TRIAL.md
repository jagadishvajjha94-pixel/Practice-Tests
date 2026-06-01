# Vercel + AWS RDS — student trial deployment

Your app is **one Next.js project**: Vercel runs the UI **and** the API (`/api/*`).  
**RDS is only the database** — you do not deploy a separate backend server for this trial.

```
Students → Vercel (Next.js + API routes) → AWS RDS PostgreSQL
```

---

## Fresh RDS (no AWS RDS)?

If this is a **new empty database**, you do **not** need AWS RDS migration. See **[RDS_FRESH_START.md](./RDS_FRESH_START.md)**.

**Tables and columns are created automatically** on first request (`AUTO_RDS_SCHEMA=true`, default). You only need `/setup` once for admin + sample tests.

---

## Overview (3 phases)

| Phase | Where | What |
|-------|--------|------|
| 1 | AWS Console | Create RDS PostgreSQL |
| 2 | Your PC | `pnpm init:rds` **or** use `/setup` on Vercel |
| 3 | Vercel | Set env vars → Redeploy |

---

## Phase 1 — Create RDS (AWS Console)

1. **RDS** → **Create database** → **PostgreSQL 15** (or 16).
2. Template: **Free tier** or **Dev/Test** for trial.
3. DB identifier: `prepindia-trial`
4. Master username: `prepindia_admin`
5. Master password: *(save securely)*
6. Database name: `prepindia`
7. Instance: `db.t4g.micro` or `db.t3.micro` (trial).
8. **Public access: Yes** *(required so Vercel serverless can connect)*.
9. VPC security group: create new → edit **inbound rules**:
   - Type: **PostgreSQL**, Port **5432**
   - Source: **0.0.0.0/0** *(trial only — lock down after trial)*
10. Create database (wait ~5–10 min).

Copy the **endpoint** from RDS → `prepindia-trial.xxxxx.ap-south-1.rds.amazonaws.com`.

**Connection string:**

```text
postgresql://prepindia_admin:YOUR_PASSWORD@prepindia-trial.xxxxx.ap-south-1.rds.amazonaws.com:5432/prepindia?sslmode=require
```

---

## Phase 2 — Prepare RDS from your computer

### 2.1 Local env file

In the project root, create or edit `.env.local`:

```env
DATABASE_URL=postgresql://prepindia_admin:PASSWORD@....rds.amazonaws.com:5432/prepindia?sslmode=require
DIRECT_URL=postgresql://prepindia_admin:PASSWORD@....rds.amazonaws.com:5432/prepindia?sslmode=require

PREPINDIA_ADMIN_EMAIL=admin@rce.ac.in
PREPINDIA_ADMIN_PASSWORD=YourSecureAdminPass

# Only if copying existing AWS RDS data:
# SUPABASE_DATABASE_URL=postgresql://postgres:...@db.xxx.rds.co:5432/postgres
# MIGRATION_DEFAULT_PASSWORD=TempReset@2025
```

### 2.2 Run setup script

```bash
pnpm install
node scripts/setup-rds-vercel-trial.mjs
```

To **copy data from AWS RDS**:

```bash
# Full migration (all tables: users, tests, questions, schedules, evalora, rmset, rosters, …)
node scripts/setup-rds-vercel-trial.mjs --migrate-rds
# Or directly:
node scripts/migrate-rds-to-rds.mjs
```

This will:

- Create all tables (`prisma db push`)
- Optionally migrate users, tests, questions, schedules
- Create admin login in RDS

### 2.3 Verify locally (optional)

```bash
# Add to .env.local for local test:
USE_AWS_STACK=true
USE_PRISMA_AUTH=true
NEXT_PUBLIC_USE_AWS_STACK=true
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=http://localhost:3000

pnpm dev
```

- Open `http://localhost:3000/api/health` → `"database":"ok"`, `"auth_mode":"prisma_jwt"`
- Admin: `http://localhost:3000/auth/login/admin`
- Student: `http://localhost:3000/auth/login/student`

---

## Phase 3 — Connect Vercel to RDS

### 3.1 Environment variables

Vercel → your project → **Settings** → **Environment Variables**.

Add everything from [`.env.vercel-rds.example`](../.env.vercel-rds.example) for **Production** (and Preview if you want).

**Critical variables:**

| Variable | Value |
|----------|--------|
| `USE_AWS_STACK` | `true` |
| `USE_PRISMA_AUTH` | `true` |
| `NEXT_PUBLIC_USE_AWS_STACK` | `true` |
| `DATABASE_URL` | RDS URL with `?sslmode=require&connection_limit=1` |
| `DIRECT_URL` | Same RDS URL (migrations; optional on Vercel runtime) |
| `AUTH_SECRET` | Random 32+ bytes (`openssl rand -base64 32`) |
| `AUTH_URL` | `https://your-app.vercel.app` |
| `AUTH_TRUST_HOST` | `true` |
| `NEXT_PUBLIC_APP_URL` | Same as `AUTH_URL` |
| `NEXT_PUBLIC_SIGNUP_DISABLED` | `true` (recommended for trial) |

**Remove or leave unset** (do not use AWS RDS on trial):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3.2 Redeploy

Vercel → **Deployments** → latest → **Redeploy** (or push a commit to `main`).

### 3.3 Smoke test on production

```bash
curl https://your-app.vercel.app/api/health
```

Expected:

```json
{
  "status": "healthy",
  "checks": {
    "app": "ok",
    "auth_mode": "prisma_jwt",
    "database": "ok"
  }
}
```

Then test in browser:

1. **Admin** — `https://your-app.vercel.app/auth/login/admin`
2. **Student** — `https://your-app.vercel.app/auth/login/student` (roll + password)
3. **Exams** — `https://your-app.vercel.app/exams`
4. **Take exam** — start → answer → submit

---

## Student accounts for trial

Students must exist in RDS `users` with a **bcrypt password hash**.

**Option A — migrated from AWS RDS**  
Run `migrate-rds-to-rds.mjs` with `MIGRATION_DEFAULT_PASSWORD`, then tell students to use that temp password once.

**Option B — create manually (SQL)**  
Use bcrypt hash from bootstrap script pattern, or add users via a small script.

**Option C — roster + login**  
If you use roll-number login, ensure `users.roll_number` and `password_hash` are set (student email format: `roll@college.domain` per `studentAuthEmail()`).

---

## What works on Vercel + RDS trial

| Feature | Status |
|---------|--------|
| Student / admin login (NextAuth) | ✅ |
| Student exam list (`/exams`) | ✅ |
| Take test + submit + autosave | ✅ |
| Admin dashboard stats (partial) | ✅ |
| Exam builder / full admin user list | ⚠️ Still limited (AWS RDS APIs not migrated) |
| Proctor S3 uploads | Optional (set AWS keys) |
| Evalora modules | ❌ Not in Prisma schema yet |

For trial, share **direct exam links** if the portal is empty:  
`https://your-app.vercel.app/tests/take/<test-id>`

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `/api/health` → database error | Check RDS public access, security group port 5432, password, `sslmode=require` |
| 401 on APIs after login | `AUTH_SECRET` and `AUTH_URL` must match Vercel URL exactly |
| Can't connect from Vercel | RDS must be **public**; SG must allow inbound 5432 |
| Admin login fails | Re-run `node scripts/bootstrap-admin-aws.mjs` with correct `DATABASE_URL` |
| Empty exam list | Migrate schedules/tests; or share direct `/tests/take/...` links |
| `Too many connections` | Add `connection_limit=1` to `DATABASE_URL`; consider RDS Proxy later |

---

## Security after trial

- Restrict RDS security group to known IPs or move app to EC2 in same VPC.
- Rotate `AUTH_SECRET` and admin password.
- Remove `0.0.0.0/0` on port 5432.
- Enable automated RDS backups.

---

## Quick reference

```bash
# Local RDS setup
node scripts/setup-rds-vercel-trial.mjs --migrate-rds

# Re-bootstrap admin
pnpm bootstrap:admin:aws
```

Vercel env template: [`.env.vercel-rds.example`](../.env.vercel-rds.example)
