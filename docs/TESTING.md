# Automated testing (PrepIndia Web)

This app uses two layers of automated tests:

| Layer | Tool | What it covers |
|-------|------|----------------|
| **Unit** | [Vitest](https://vitest.dev/) | Pure logic (e.g. exam slot validation, roster CSV parsing) |
| **E2E** | [Playwright](https://playwright.dev/) | Browser smoke tests (landing, auth flows, key routes) |

## Prerequisites

```bash
cd apps/prepindia-web
pnpm install
pnpm exec playwright install chromium   # once per machine
```

## Commands

```bash
pnpm run test:unit          # fast logic tests
pnpm run test:unit:watch    # watch mode
pnpm run test:e2e           # starts dev server if needed, runs Playwright
pnpm run test:e2e:ui        # interactive Playwright UI
pnpm run test               # unit + e2e
```

## E2E against a running server

If `pnpm run dev` is already running on port 3000:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm run test:e2e
```

## Adding tests

- **Unit:** add `tests/unit/<feature>.test.ts` and import from `@/lib/...`.
- **E2E:** add specs under `e2e/`. Prefer role-based selectors (`getByRole`, `getByLabel`).

## CI

GitHub Actions runs `test:unit` and `test:e2e` for `apps/prepindia-web` on push/PR (see `.github/workflows/ci.yml`).

## Optional: authenticated flows

For flows that need AWS RDS login, use test credentials from `docs/ELEVATEX_SAMPLE_CREDENTIALS.md` and set env vars in a local `.env.test.local` (not committed). Extend `e2e/` with a `storageState` fixture when you add stable test users.
