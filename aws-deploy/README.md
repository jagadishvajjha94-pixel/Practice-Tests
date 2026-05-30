# AWS deploy packages — frontend + backend

PrepIndia is a **Next.js full-stack app**. API routes live in `app/api/`; UI lives in `app/` + `components/`.

For AWS EC2 you can deploy in two ways:

| Mode | Folder | When to use |
|------|--------|-------------|
| **Split (2 EC2)** | `dist/frontend` + `dist/backend` | Separate web and API servers |
| **Monolith (1 EC2)** | `dist/monolith` | Simplest — one server (recommended for trial) |

## 1. Build deploy folders (on your PC)

From repo root:

```bash
pnpm run prepare:aws
```

This creates:

```
aws-deploy/dist/
  frontend/     ← push to Frontend EC2 (port 3000)
  backend/      ← push to Backend EC2 (port 3001)
  monolith/     ← push to single EC2 (port 3000, API + UI together)
```

Each folder is a **complete runnable copy** with its own `package.json`, `deploy.sh`, and nginx config.

## 2. Push to EC2

**Option A — one EC2 (easiest)**

```bash
# Zip and upload aws-deploy/dist/monolith to EC2
scp -r aws-deploy/dist/monolith ec2-user@YOUR_EC2_IP:/opt/prepindia
ssh ec2-user@YOUR_EC2_IP
cd /opt/prepindia
cp .env.aws.example .env.production   # edit with RDS endpoint
pnpm install --frozen-lockfile
./deploy/deploy.sh
```

**Option B — two EC2 instances**

1. Upload `dist/backend` to Backend EC2 → run `./deploy/deploy.sh` (port **3001**)
2. Upload `dist/frontend` to Frontend EC2 → set `NEXT_PUBLIC_API_URL=http://BACKEND_IP:3001` in `.env.production` → run `./deploy/deploy.sh` (port **3000**)
3. Point students to Frontend EC2 IP / domain

## 3. What goes where (source repo)

| Layer | Paths in this repo |
|-------|-------------------|
| **Frontend (UI)** | `app/` (pages), `components/`, `hooks/`, `public/`, `styles/` |
| **Backend (API + DB)** | `app/api/`, `lib/`, `prisma/`, `auth.ts`, `proxy.ts`, `scripts/` |
| **Shared (both need)** | `lib/`, `types/`, `prisma/`, `auth.ts`, Next config files |

See `shared/manifest.json` for the full file list used by the prepare script.

## 4. Environment

Copy and edit on each EC2:

- Monolith / backend: use root `.env.aws.example`
- Frontend (split mode): also set `NEXT_PUBLIC_API_URL`

## 5. nginx on EC2

```bash
sudo cp deploy/nginx.conf /etc/nginx/conf.d/prepindia.conf
sudo nginx -t && sudo systemctl reload nginx
```

Templates are inside each package under `deploy/`.
