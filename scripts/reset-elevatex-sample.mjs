/**
 * Remove 42 ElevateX demo students (EXS1001–EXS1042) so real students can sign up again.
 * Usage: node scripts/reset-elevatex-sample.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@/lib/db/get-db-service';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const EMAIL_DOMAIN = 'ramachandra.edu';
const COUNT = 42;
const LEGACY_ROLLS = Array.from({ length: 15 }, (_, i) => `EX260${String(i + 1).padStart(2, '0')}`);

const ROLLS = [
  ...Array.from({ length: COUNT }, (_, i) => `EXS1${String(i + 1).padStart(3, '0')}`),
  ...LEGACY_ROLLS,
];

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

function studentEmail(roll) {
  return `${roll.trim().toLowerCase()}@student.${EMAIL_DOMAIN}`;
}

function normalizeRoll(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

async function listAllUsers(supabaseUrl, serviceKey) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) return [];
  const payload = await res.json();
  return payload.users ?? [];
}

async function main() {
  loadEnvLocal();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const users = await listAllUsers(supabaseUrl, serviceKey);
  const byEmail = new Map(users.map((u) => [(u.email || '').toLowerCase(), u]));

  let deleted = 0;
  let notFound = 0;

  for (const roll of ROLLS) {
    const email = studentEmail(roll);
    const user = byEmail.get(email.toLowerCase());
    const rollNorm = normalizeRoll(roll);

    await db.from('student_active_sessions').delete().eq('roll_number', rollNorm);
    await db.from('exam_student_roster').delete().eq('roll_number', rollNorm);
    await db.from('exam_slot_roster_entries').delete().eq('roll_number', rollNorm);

    if (!user?.id) {
      notFound += 1;
      continue;
    }

    const { error } = await db.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(`${roll}: ${error.message}`);
      continue;
    }
    await db.from('users').delete().eq('id', user.id);
    byEmail.delete(email.toLowerCase());
    deleted += 1;
    console.log(`Removed ${roll} (${email})`);
  }

  console.log(`\nDone. Deleted ${deleted} auth account(s). ${notFound} roll(s) had no auth user.`);
  console.log('Students can sign up again at /auth/signup/student');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
