/**
 * Backfill public.users for all auth students (department + year from metadata).
 * Usage: node scripts/sync-student-profiles.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@/lib/db/get-db-service';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = val;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error('Missing Supabase env in .env.local');
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

let page = 1;
let synced = 0;
while (page <= 50) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error || !data?.users?.length) break;

  for (const user of data.users) {
    const meta = user.user_metadata ?? {};
    const role = String(meta.role ?? 'student');
    if (role === 'admin' || role === 'faculty') continue;

    const branch = meta.department ?? meta.branch ?? null;
    const academic_year = meta.year ?? meta.academic_year ?? null;
    const full_name = meta.full_name ?? meta.name ?? null;

    const { error: upsertErr } = await admin.from('users').upsert(
      {
        id: user.id,
        email: user.email,
        full_name,
        branch,
        academic_year,
        user_role: 'student',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (!upsertErr) synced += 1;
    else console.warn(user.email, upsertErr.message);
  }

  if (data.users.length < 200) break;
  page += 1;
}

console.log(`✅ Synced ${synced} student profile(s) into public.users`);
