/**
 * One-time data migration: Supabase PostgreSQL → AWS RDS (Prisma schema).
 *
 * Prerequisites:
 *   - SUPABASE_DATABASE_URL (direct Postgres connection string from Supabase dashboard)
 *   - DATABASE_URL (RDS connection string)
 *
 * Usage: node scripts/migrate-supabase-to-rds.mjs [--dry-run]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes('--dry-run');

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(__dirname, '..', name);
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

const sourceUrl = process.env.SUPABASE_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;

if (!sourceUrl || !targetUrl) {
  console.error('❌ Set SUPABASE_DATABASE_URL and DATABASE_URL');
  process.exit(1);
}

const source = postgres(sourceUrl, { max: 5 });
const prisma = new PrismaClient();

const TABLES = [
  { from: 'users', map: mapUser },
  { from: 'admin_users', map: mapAdminUser },
  { from: 'test_categories', map: mapTestCategory },
  { from: 'tests', map: mapTest },
  { from: 'questions', map: mapQuestion },
  { from: 'test_attempts', map: mapTestAttempt },
  { from: 'exam_schedules', map: mapExamSchedule },
  { from: 'exam_slot_roster_entries', map: mapRosterEntry },
  { from: 'student_dashboard_stats', map: mapDashboardStat },
];

function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash ?? null,
    rollNumber: row.roll_number ?? null,
    fullName: row.full_name ?? null,
    college: row.college ?? null,
    branch: row.branch ?? null,
    academicYear: row.academic_year ?? null,
    subscriptionStatus: row.subscription_status ?? 'free',
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function mapAdminUser(row) {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role ?? 'admin',
    permissions: row.permissions ?? null,
    createdAt: row.created_at,
  };
}

function mapTestCategory(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
    order: row.order,
    createdAt: row.created_at,
  };
}

function mapTest(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    name: row.name,
    description: row.description,
    durationMinutes: row.duration_minutes,
    duration: row.duration,
    totalQuestions: row.total_questions,
    passingScore: row.passing_score,
    difficulty: row.difficulty,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function mapQuestion(row) {
  return {
    id: row.id,
    testId: row.test_id,
    categoryId: row.category_id,
    questionText: row.question_text,
    questionType: row.question_type ?? row.type ?? 'MCQ',
    type: row.type ?? 'MCQ',
    difficulty: row.difficulty ?? 'medium',
    optionA: row.option_a,
    optionB: row.option_b,
    optionC: row.option_c,
    optionD: row.option_d,
    options: row.options,
    correctAnswer: row.correct_answer,
    explanation: row.explanation,
    tags: row.tags ?? [],
    marks: row.marks ?? 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function mapTestAttempt(row) {
  return {
    id: row.id,
    userId: row.user_id,
    testId: row.test_id,
    testTitle: row.test_title,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    score: row.score,
    percentageScore: row.percentage_score,
    totalScore: row.total_score,
    answers: row.answers,
    timeTaken: row.time_taken,
    status: row.status ?? 'in_progress',
    proctorFlags: row.proctor_flags ?? 0,
    proctorMetadata: row.proctor_metadata,
    scheduleId: row.schedule_id,
    slotNumber: row.slot_number,
    createdAt: row.created_at,
  };
}

function mapExamSchedule(row) {
  return {
    id: row.id,
    testId: row.test_id,
    title: row.title,
    status: row.status ?? 'draft',
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    targetDepartments: row.target_departments ?? [],
    targetYears: row.target_years ?? [],
    slotNumber: row.slot_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function mapRosterEntry(row) {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    rollNumber: row.roll_number,
    password: row.password,
    department: row.department,
    year: row.year,
    createdAt: row.created_at,
  };
}

function mapDashboardStat(row) {
  return {
    id: row.id,
    userId: row.user_id,
    statKey: row.stat_key,
    payload: row.payload,
    updatedAt: row.updated_at,
  };
}

async function migrateAuthUsers() {
  console.log('▶ Migrating auth.users passwords (requires Supabase service role)…');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.warn('  Skipped — set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to hash passwords');
    return;
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=1000`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) {
    console.warn('  Could not list auth users:', res.status);
    return;
  }

  const payload = await res.json();
  const users = payload.users ?? [];
  let updated = 0;

  for (const au of users) {
    if (!au.email) continue;
    const tempPassword = process.env.MIGRATION_DEFAULT_PASSWORD;
    if (!tempPassword) continue;

    const hash = await bcrypt.hash(tempPassword, 12);
    if (dryRun) {
      updated++;
      continue;
    }

    await prisma.user.updateMany({
      where: { email: au.email.toLowerCase() },
      data: { passwordHash: hash },
    });
    updated++;
  }

  console.log(`  ${dryRun ? 'Would update' : 'Updated'} ${updated} user password hashes`);
  if (!process.env.MIGRATION_DEFAULT_PASSWORD) {
    console.warn('  Set MIGRATION_DEFAULT_PASSWORD to assign temporary passwords, then force reset on first login');
  }
}

async function main() {
  console.log(dryRun ? '🔍 DRY RUN' : '🚀 Migrating Supabase → RDS');

  for (const { from, map } of TABLES) {
    const rows = await source.unsafe(`SELECT * FROM public.${from}`);
    console.log(`▶ ${from}: ${rows.length} rows`);

    if (dryRun || rows.length === 0) continue;

    const prismaModel = {
      users: prisma.user,
      admin_users: prisma.adminUser,
      test_categories: prisma.testCategory,
      tests: prisma.test,
      questions: prisma.question,
      test_attempts: prisma.testAttempt,
      exam_schedules: prisma.examSchedule,
      exam_slot_roster_entries: prisma.examSlotRosterEntry,
      student_dashboard_stats: prisma.studentDashboardStat,
    }[from];

    if (!prismaModel) continue;

    const batchSize = 200;
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize).map(map);
      await prismaModel.createMany({ data: chunk, skipDuplicates: true });
    }
  }

  await migrateAuthUsers();

  console.log('✅ Migration complete');
  await source.end();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
