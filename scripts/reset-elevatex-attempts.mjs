/**
 * Clear ElevateX attempts for EXS1001–EXS1042 (keeps login accounts).
 * Usage: node scripts/reset-elevatex-attempts.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@/lib/db/get-db-service';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const EMAIL_DOMAIN = 'ramachandra.edu';
const COUNT = 42;
const ELEVATEX_TEST_IDS = new Set(['placement_full']);
const isElevateXTestId = (id) => {
  const v = String(id ?? '').trim().toLowerCase();
  return ELEVATEX_TEST_IDS.has(v) || v.startsWith('placement-');
};
const isElevateXTitle = (title) => /\belevatex\b/i.test(String(title ?? ''));

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

  const rolls = Array.from({ length: COUNT }, (_, i) => `EXS1${String(i + 1).padStart(3, '0')}`);
  let attemptsDeleted = 0;
  let studentsFound = 0;

  for (const roll of rolls) {
    const user = byEmail.get(studentEmail(roll));
    if (!user?.id) {
      console.log(`Skip ${roll} — no auth account`);
      continue;
    }
    studentsFound += 1;

    await db.from('student_active_sessions').delete().eq('roll_number', normalizeRoll(roll));

    const { data: attempts } = await supabase
      .from('test_attempts')
      .select('id, test_id, test_title')
      .eq('user_id', user.id);

    const ids = (attempts ?? [])
      .filter((a) => isElevateXTestId(a.test_id) || isElevateXTitle(a.test_title))
      .map((a) => a.id);

    if (ids.length === 0) continue;

    await db.from('exam_violations').delete().in('attempt_id', ids);
    const { data: deleted } = await db.from('test_attempts').delete().in('id', ids).select('id');
    attemptsDeleted += deleted?.length ?? 0;
    console.log(`${roll}: removed ${deleted?.length ?? 0} ElevateX attempt(s)`);
  }

  console.log(
    `\nDone. ${studentsFound} student(s), ${attemptsDeleted} attempt(s) deleted. Log in with ElevateX2026 and open /placement/assessment.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
