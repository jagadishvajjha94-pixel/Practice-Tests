/**
 * One-time RDS setup for Vercel trial (run on your laptop, not on Vercel).
 *
 * Prerequisites:
 *   - AWS RDS PostgreSQL created (public access ON for Vercel trial)
 *   - DATABASE_URL and DIRECT_URL in .env.local
 *
 * Usage (fresh RDS — recommended):
 *   node scripts/init-rds-fresh.mjs
 *
 * Usage (with Supabase data copy):
 *   node scripts/setup-rds-vercel-trial.mjs --migrate-supabase
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const migrateSupabase = process.argv.includes('--migrate-supabase');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is missing. Add your RDS URL to .env.local');
  console.error('   Example: postgresql://user:pass@host.region.rds.amazonaws.com:5432/prepindia?sslmode=require');
  process.exit(1);
}

if (!process.env.DIRECT_URL) {
  console.warn('⚠️  DIRECT_URL not set — using DATABASE_URL for migrations');
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

console.log('▶ Generating Prisma client...');
execSync('npx prisma generate', { cwd: root, stdio: 'inherit' });

console.log('▶ Pushing schema to RDS (creates tables)...');
execSync('npx prisma db push --accept-data-loss', { cwd: root, stdio: 'inherit' });

if (migrateSupabase) {
  if (!process.env.SUPABASE_DATABASE_URL) {
    console.error('❌ --migrate-supabase requires SUPABASE_DATABASE_URL in .env.local');
    process.exit(1);
  }
  console.log('▶ Full data migration from Supabase → RDS...');
  execSync('node scripts/migrate-supabase-to-rds.mjs', { cwd: root, stdio: 'inherit' });
} else {
  console.log('ℹ️  Skipping data migration. To copy Supabase data:');
  console.log('   node scripts/setup-rds-vercel-trial.mjs --migrate-supabase');
}

console.log('▶ Bootstrapping admin user...');
execSync('node scripts/bootstrap-admin-aws.mjs', { cwd: root, stdio: 'inherit' });

console.log('\n✅ RDS is ready for Vercel trial.');
console.log('Next: add env vars in Vercel (see docs/VERCEL_RDS_TRIAL.md) and redeploy.\n');
