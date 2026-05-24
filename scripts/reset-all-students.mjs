/**
 * Remove ALL student/faculty logins and wipe attempt/roster data. Keeps admin only.
 * Usage: node scripts/reset-all-students.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function loadEnvLocal() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
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

function isProtectedAccount(email, metadata) {
  const normalized = String(email ?? '').trim().toLowerCase();
  if (normalized.includes('@admin.')) return true;
  if (String(metadata?.role ?? '').toLowerCase() === 'admin') return true;
  return false;
}

async function listAllAuthUsers(supabase) {
  const users = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    if (!data?.users?.length) break;
    for (const user of data.users) {
      users.push({
        id: user.id,
        email: user.email ?? '',
        metadata: user.user_metadata ?? {},
      });
    }
    if (data.users.length < 200) break;
  }
  return users;
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

console.log('Resetting all student/faculty accounts (admin kept)…');

const tables = [
  ['exam_violations', 'id'],
  ['test_attempts', 'id'],
  ['student_dashboard_stats', 'user_id'],
  ['student_active_sessions', 'roll_number'],
  ['exam_student_roster', 'id'],
  ['exam_slot_roster_entries', 'id'],
];

for (const [table, col] of tables) {
  const { count, error } = await supabase.from(table).delete({ count: 'exact' }).not(col, 'is', null);
  if (error) console.warn(`  ${table}: ${error.message}`);
  else console.log(`  Cleared ${table}: ${count ?? 0} row(s)`);
}

const authUsers = await listAllAuthUsers(supabase);
const protectedIds = new Set(
  authUsers.filter((u) => isProtectedAccount(u.email, u.metadata)).map((u) => u.id),
);

let authDeleted = 0;
for (const user of authUsers) {
  if (protectedIds.has(user.id)) continue;
  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) console.warn(`  auth ${user.email}: ${error.message}`);
  else authDeleted += 1;
}
console.log(`  Deleted auth users: ${authDeleted}`);

const { data: profiles } = await supabase.from('users').select('id, email, user_role');
let profilesDeleted = 0;
for (const row of profiles ?? []) {
  if (protectedIds.has(String(row.id))) continue;
  const email = String(row.email ?? '');
  const role = String(row.user_role ?? '').toLowerCase();
  if (email.includes('@admin.') || role === 'admin') continue;
  const { error } = await supabase.from('users').delete().eq('id', row.id);
  if (error) console.warn(`  profile ${email}: ${error.message}`);
  else profilesDeleted += 1;
}
console.log(`  Deleted profile rows: ${profilesDeleted}`);
console.log('Done. Admin logins preserved.');
