/**
 * Fresh AWS RDS — no Supabase migration.
 * Creates all tables/columns from prisma/schema.prisma, admin user, and sample data.
 *
 * Requires in .env.local:
 *   DATABASE_URL, DIRECT_URL
 *   PREPINDIA_ADMIN_EMAIL, PREPINDIA_ADMIN_PASSWORD (optional)
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

if (!process.env.DATABASE_URL) {
  console.error('❌ Set DATABASE_URL in .env.local');
  process.exit(1);
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

console.log('▶ prisma generate');
execSync('npx prisma generate', { cwd: root, stdio: 'inherit' });

console.log('▶ prisma db push (creates all tables + columns)');
execSync('npx prisma db push --accept-data-loss', { cwd: root, stdio: 'inherit' });

console.log('▶ bootstrap admin + sample categories/tests');
execSync('node scripts/bootstrap-rds-baseline.mjs', { cwd: root, stdio: 'inherit' });

console.log('\n✅ Fresh RDS is ready.');
console.log('   Admin login: /auth/login/admin');
console.log('   Or open https://your-app.vercel.app/setup (AWS mode)\n');
