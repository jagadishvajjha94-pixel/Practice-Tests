import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
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

function resolvePostgresUrl() {
  const direct = process.env.POSTGRES_URL?.trim();
  if (direct && !direct.includes('YOUR_')) return direct;

  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!password || !supabaseUrl) return null;

  const ref = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/i)?.[1];
  if (!ref) return null;

  const host = process.env.SUPABASE_DB_HOST?.trim() || `db.${ref}.supabase.co`;
  const port = process.env.SUPABASE_DB_PORT?.trim() || '5432';
  const user = process.env.SUPABASE_DB_USER?.trim() || 'postgres';
  const database = process.env.SUPABASE_DB_NAME?.trim() || 'postgres';

  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

loadEnvLocal();

const url = resolvePostgresUrl();
if (!url) {
  console.error('❌ Database connection not configured.');
  console.error('');
  console.error('Option A — add to apps/prepindia-web/.env.local:');
  console.error('  POSTGRES_URL=postgresql://postgres:YOUR_PASSWORD@db.lwkmfpcewpisezmcsext.supabase.co:5432/postgres');
  console.error('');
  console.error('Option B — only the password:');
  console.error('  SUPABASE_DB_PASSWORD=your_database_password');
  console.error('');
  console.error('Get the password: Supabase Dashboard → Project Settings → Database');
  console.error('');
  console.error('Option C — run SQL manually in Supabase SQL Editor:');
  console.error('  supabase/migrations/004_users_and_admin_setup.sql');
  console.error('  https://supabase.com/dashboard/project/lwkmfpcewpisezmcsext/sql/new');
  process.exit(1);
}

const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '004_users_and_admin_setup.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');
const client = postgres(url, { max: 1, onnotice: () => {} });

try {
  console.log('▶ Applying users + admin_users setup…');
  await client.unsafe(sql);
  const users = await client`SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'`;
  const admins = await client`SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users'`;
  console.log(users.length ? '✅ public.users' : '⚠ public.users missing');
  console.log(admins.length ? '✅ public.admin_users' : '⚠ public.admin_users missing');
  console.log('');
  console.log('Next: http://localhost:3000/auth/admin/login → Create admin');
} catch (e) {
  console.error('❌ Setup failed:', e.message);
  process.exit(1);
} finally {
  await client.end();
}
