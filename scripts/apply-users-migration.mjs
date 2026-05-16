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

loadEnvLocal();

const url = process.env.POSTGRES_URL;
if (!url || url.includes('YOUR_')) {
  console.error('❌ POSTGRES_URL missing in apps/prepindia-web/.env.local');
  console.error('   Supabase → Project Settings → Database → Connection string (URI) → paste as POSTGRES_URL');
  process.exit(1);
}

const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_users_resume.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const client = postgres(url, { max: 1, onnotice: () => {} });

try {
  console.log('▶ Applying migration: 001_users_resume.sql');
  await client.unsafe(sql);
  console.log('✅ Migration applied successfully.');
  const rows = await client`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' ORDER BY ordinal_position`;
  console.log('✅ public.users columns:', rows.map((r) => r.column_name).join(', '));
} catch (e) {
  console.error('❌ Migration failed:', e.message);
  process.exit(1);
} finally {
  await client.end();
}
