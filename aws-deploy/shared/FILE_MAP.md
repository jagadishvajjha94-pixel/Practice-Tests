# Source repo file map (PrepIndia)

This app is **one Next.js project**. UI and API share `lib/` and `prisma/`.
The prepare script copies the same source into each AWS package so `next build` works.

## Frontend files (UI)

| Path | Purpose |
|------|---------|
| `app/` | Pages (admin, tests, auth, dashboard, setup, …) — **excluding** only logical split; `app/api/` is backend |
| `components/` | React UI components |
| `hooks/` | Client hooks (exam autosave, proctoring) |
| `public/` | Static assets |
| `styles/` | Global CSS |
| `postcss.config.mjs` | Tailwind |
| `components.json` | shadcn config |

## Backend files (API + database)

| Path | Purpose |
|------|---------|
| `app/api/` | **84 API routes** (auth, admin, student, exam, setup, health) |
| `lib/` | Business logic, Prisma helpers, auth, AWS S3 |
| `prisma/schema.prisma` | RDS PostgreSQL schema |
| `auth.ts` | NextAuth entry |
| `proxy.ts` | Middleware (role redirects) |
| `instrumentation.ts` | Auto RDS schema on startup |
| `scripts/` | bootstrap, migrate, RDS init |
| `types/` | TypeScript types |

## Shared (required by both packages)

| Path | Why |
|------|-----|
| `lib/` | Imported by pages and API routes |
| `prisma/` | Server components and API use DB |
| `auth.ts`, `proxy.ts` | Auth on pages and API |
| `next.config.mjs`, `tsconfig.json` | Build |

## Not included in AWS packages

- `swarx-mvp/` — separate Mongo MVP
- `e2e/`, `tests/` — Playwright/Vitest
- `docs/` — documentation only
- `node_modules/`, `.next/` — built on EC2

## Deploy modes

| Package | Port | Use |
|---------|------|-----|
| `dist/monolith` | 3000 | **Recommended** — one EC2, UI + API |
| `dist/backend` | 3001 | API-only nginx; RDS + Prisma |
| `dist/frontend` | 3000 | UI nginx; optional proxy to backend EC2 |
