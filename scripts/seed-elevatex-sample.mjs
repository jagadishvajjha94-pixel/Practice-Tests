/**
 * Seed 15 ElevateX sample students + go-live placement_full (ElevateX) schedule.
 * Usage: node scripts/seed-elevatex-sample.mjs
 * Writes docs/ELEVATEX_SAMPLE_CREDENTIALS.md
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const EMAIL_DOMAIN = 'ramachandra.edu';
/** No @ symbol — easier to type; override with ELEVATEX_SAMPLE_PASSWORD in .env.local */
const DEFAULT_PASSWORD = process.env.ELEVATEX_SAMPLE_PASSWORD || 'ElevateX2026';
const MODULE_KEY = 'placement_full';

const STUDENTS = [
  { roll: 'EX26001', fullName: 'ElevateX Sample 01', department: 'Computer Science Engineering', year: 'III Year' },
  { roll: 'EX26002', fullName: 'ElevateX Sample 02', department: 'Electronics & Communication Engineering', year: 'III Year' },
  { roll: 'EX26003', fullName: 'ElevateX Sample 03', department: 'Mechanical Engineering', year: 'III Year' },
  { roll: 'EX26004', fullName: 'ElevateX Sample 04', department: 'Civil Engineering', year: 'III Year' },
  { roll: 'EX26005', fullName: 'ElevateX Sample 05', department: 'Computer Science Engineering (Cyber Security)', year: 'III Year' },
  { roll: 'EX26006', fullName: 'ElevateX Sample 06', department: 'Artificial Intelligence and Data Science', year: 'III Year' },
  { roll: 'EX26007', fullName: 'ElevateX Sample 07', department: 'Artificial Intelligence & Machine Learning', year: 'III Year' },
  { roll: 'EX26008', fullName: 'ElevateX Sample 08', department: 'Electrical & Electronics Engineering', year: 'III Year' },
  { roll: 'EX26009', fullName: 'ElevateX Sample 09', department: 'Computer Science Engineering (Internet of Things)', year: 'III Year' },
  { roll: 'EX26010', fullName: 'ElevateX Sample 10', department: 'Business Administration', year: 'III Year' },
  { roll: 'EX26011', fullName: 'ElevateX Sample 11', department: 'Computer Science Engineering', year: 'III Year' },
  { roll: 'EX26012', fullName: 'ElevateX Sample 12', department: 'Electronics & Communication Engineering', year: 'III Year' },
  { roll: 'EX26013', fullName: 'ElevateX Sample 13', department: 'Mechanical Engineering', year: 'III Year' },
  { roll: 'EX26014', fullName: 'ElevateX Sample 14', department: 'Civil Engineering', year: 'III Year' },
  { roll: 'EX26015', fullName: 'ElevateX Sample 15', department: 'Artificial Intelligence and Data Science', year: 'III Year' },
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

async function findUserByEmail(supabaseUrl, serviceKey, email) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) return null;
  const payload = await res.json();
  const users = payload.users ?? [];
  return users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase()) ?? null;
}

async function upsertStudent(admin, supabaseUrl, serviceKey, student, password) {
  const email = studentEmail(student.roll);
  const meta = {
    full_name: student.fullName,
    role: 'student',
    department: student.department,
    branch: student.department,
    year: student.year,
    academic_year: student.year,
    roll: student.roll,
  };

  const existing = await findUserByEmail(supabaseUrl, serviceKey, email);
  let userId;

  if (existing?.id) {
    const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email_confirm: true, password, user_metadata: meta }),
    });
    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      throw new Error(`${email}: ${err.msg ?? err.message ?? updateRes.status}`);
    }
    userId = existing.id;
  } else {
    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: meta }),
    });
    const data = await createRes.json().catch(() => ({}));
    if (!createRes.ok || !data.id) {
      throw new Error(`${email}: ${data.msg ?? data.message ?? createRes.status}`);
    }
    userId = data.id;
  }

  const { error: profileErr } = await admin.from('users').upsert(
    {
      id: userId,
      email,
      full_name: student.fullName,
      branch: student.department,
      academic_year: student.year,
      user_role: 'student',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (profileErr) {
    console.warn(`  ⚠ ${email} profile skipped: ${profileErr.message}`);
  }
  return { email, userId };
}

function writeCredentialsDoc(rows, scheduleId) {
  const lines = [
    '# ElevateX — Sample Test Credentials',
    '',
    'Generated by `node scripts/seed-elevatex-sample.mjs`.',
    '',
    '## Exam',
    '',
    '- **Name:** ElevateX (placement_full)',
    '- **Duration:** 60 minutes · **Total marks:** 100',
    '- **Sections:** Technical 20 · Aptitude 20 · Logic 15 · IQ 15 · Psychometric 15 · Speaking 5 prompts (15 marks)',
    '- **Student login:** `/auth/login/student`',
    '- **Take exam:** `/placement` → Start assessment (hall ticket = roll number)',
    '',
    scheduleId ? `- **Schedule id:** \`${scheduleId}\`` : '',
    '',
    '## Shared password',
    '',
    `\`${DEFAULT_PASSWORD}\``,
    '',
    '## Sample syllabus sets (4 topic bundles)',
    '',
    '| Set | Topics |',
    '|-----|--------|',
    '| **A — STEM Core** | Technical, Aptitude, Logic, Intelligence |',
    '| **B — Industry Ready** | Technical, Aptitude, Psychometric, Speaking |',
    '| **C — Reasoning & Behaviour** | Aptitude, Logic, Intelligence, Psychometric |',
    '| **D — Full paper (live)** | All six sections (official ElevateX) |',
    '',
    '## Student logins (15)',
    '',
    '| # | Roll | Email | Department | Year |',
    '|---|------|-------|------------|------|',
  ];

  rows.forEach((r, i) => {
    lines.push(`| ${i + 1} | ${r.roll} | ${r.email} | ${r.department} | ${r.year} |`);
  });

  lines.push('', '## Quick test', '', '1. Sign in as `EX26001` with the password above.', '2. Open **ElevateX** from the student home or `/placement`.', '3. Enter hall ticket `EX26001` and matching department.', '');

  const outPath = path.join(ROOT, 'docs', 'ELEVATEX_SAMPLE_CREDENTIALS.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  return outPath;
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey || serviceKey.includes('YOUR_')) {
  console.error('❌ Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('▶ Creating 15 ElevateX sample students…');
const created = [];
for (const s of STUDENTS) {
  const row = await upsertStudent(admin, url, serviceKey, s, DEFAULT_PASSWORD);
  created.push({ ...s, email: row.email });
  console.log(`  ✅ ${s.roll}`);
}

console.log('▶ Go-live ElevateX (placement_full)…');
const endsAt = new Date('2026-06-30T18:30:00+05:30').toISOString();

const { data: liveRows } = await admin
  .from('evalora_module_schedules')
  .select('id')
  .eq('module_key', MODULE_KEY)
  .eq('status', 'live');

if (liveRows?.length) {
  await admin
    .from('evalora_module_schedules')
    .update({ status: 'ended', updated_at: new Date().toISOString() })
    .in(
      'id',
      liveRows.map((r) => r.id),
    );
}

const { data: schedule, error: schedErr } = await admin
  .from('evalora_module_schedules')
  .insert({
    module_key: MODULE_KEY,
    title: 'ElevateX — Sample Test (May 2026)',
    notice:
      'Sample ElevateX paper: Technical 20, Aptitude 20, Logic 15, IQ 15, Psychometric 15, Speaking 5 prompts. Use roll EX26001–EX26015.',
    status: 'live',
    starts_at: new Date().toISOString(),
    ends_at: endsAt,
    target_departments: [],
    target_years: ['III Year'],
    updated_at: new Date().toISOString(),
  })
  .select('id')
  .single();

let scheduleId = schedule?.id ?? null;
if (schedErr) {
  console.error('❌ Schedule insert failed:', schedErr.message);
  console.warn('  Run supabase/migrations/014_evalora_module_schedules.sql in Supabase SQL editor, then re-run this script.');
  console.warn('  Or go live manually: Admin → Evalora modules → ElevateX → Go live.');
} else {
  console.log(`  ✅ Schedule ${scheduleId} (live until ${endsAt})`);
}

const docPath = writeCredentialsDoc(created, scheduleId);
console.log('');
console.log('✅ ElevateX sample students ready (15 accounts)');
console.log(`   Credentials: ${docPath}`);
console.log(`   Password:    ${DEFAULT_PASSWORD}`);
if (!scheduleId) {
  process.exit(schedErr ? 1 : 0);
}
