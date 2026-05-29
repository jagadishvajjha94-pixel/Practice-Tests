/**
 * Full data migration: Supabase PostgreSQL → AWS RDS (Prisma schema).
 *
 * Prerequisites:
 *   SUPABASE_DATABASE_URL — direct Postgres from Supabase dashboard
 *   DATABASE_URL — RDS connection string
 *
 * Usage:
 *   node scripts/migrate-supabase-to-rds.mjs --dry-run
 *   node scripts/migrate-supabase-to-rds.mjs
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
  console.error('❌ Set SUPABASE_DATABASE_URL and DATABASE_URL in .env.local');
  process.exit(1);
}

const source = postgres(sourceUrl, { max: 5 });
const prisma = new PrismaClient();

async function tableExists(name) {
  const rows = await source`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${name}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function copyTable(table, mapFn, prismaModel) {
  if (!(await tableExists(table))) {
    console.log(`▶ ${table}: skipped (not in source)`);
    return;
  }
  const rows = await source.unsafe(`SELECT * FROM public.${table}`);
  console.log(`▶ ${table}: ${rows.length} rows`);
  if (dryRun || rows.length === 0 || !prismaModel) return;
  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize).map(mapFn).filter(Boolean);
    if (!chunk.length) continue;
    await prismaModel.createMany({ data: chunk, skipDuplicates: true });
  }
}

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
    cgpa: row.cgpa ?? null,
    phone: row.phone ?? null,
    subscriptionStatus: row.subscription_status ?? 'free',
    subscriptionEndDate: row.subscription_end_date ?? null,
    resumeText: row.resume_text ?? null,
    resumeFileName: row.resume_file_name ?? null,
    resumeStoragePath: row.resume_storage_path ?? null,
    resumeUpdatedAt: row.resume_updated_at ?? null,
    userRole: row.user_role ?? 'student',
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
    difficultyLevel: row.difficulty_level,
    isPaid: row.is_paid,
    questionTimeLimitSec: row.question_time_limit_sec,
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

function mapQuestionTag(row) {
  return { id: row.id, name: row.name, slug: row.slug };
}

function mapQuestionTagLink(row) {
  return { questionId: row.question_id, tagId: row.tag_id };
}

function mapTestAttempt(row) {
  return {
    id: row.id,
    userId: row.user_id,
    testId: row.test_id != null ? String(row.test_id) : null,
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
    testId: row.test_id != null ? String(row.test_id) : null,
    title: row.title,
    description: row.description,
    notice: row.notice,
    facultyExamRequestId: row.faculty_exam_request_id,
    status: row.status ?? 'draft',
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    targetDepartments: row.target_departments ?? [],
    targetYears: row.target_years ?? [],
    slotNumber: row.slot_number,
    slotCapacity: row.slot_capacity,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function mapFacultyExamRequest(row) {
  return {
    id: row.id,
    facultyUserId: row.faculty_user_id,
    department: row.department,
    title: row.title,
    description: row.description,
    topic: row.topic,
    targetYears: row.target_years ?? [],
    targetBranches: row.target_branches ?? [],
    durationMinutes: row.duration_minutes ?? 30,
    questionsJson: row.questions_json ?? [],
    status: row.status ?? 'pending',
    adminNote: row.admin_note,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    publishedTestId: row.published_test_id != null ? String(row.published_test_id) : null,
    testType: row.test_type,
    slotKey: row.slot_key,
    syllabusTopicIds: row.syllabus_topic_ids ?? [],
    questionsPerTopic: row.questions_per_topic,
    usesSlotScheduling: row.uses_slot_scheduling ?? false,
    scheduleSlotsJson: row.schedule_slots_json ?? [],
    departmentGroupId: row.department_group_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function mapEvalora(row) {
  return {
    id: row.id,
    moduleKey: row.module_key,
    title: row.title,
    notice: row.notice,
    status: row.status ?? 'scheduled',
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    targetDepartments: row.target_departments ?? [],
    targetYears: row.target_years ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function mapRosterEntry(row) {
  return {
    id: row.id,
    facultyExamRequestId: row.faculty_exam_request_id,
    scheduleId: row.schedule_id,
    slotNumber: row.slot_number,
    rollNumber: row.roll_number,
    studentName: row.student_name,
    email: row.email,
    password: row.password,
    department: row.department,
    year: row.year,
    createdAt: row.created_at,
  };
}

function mapExamStudentRoster(row) {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    rollNumber: row.roll_number,
    fullName: row.full_name,
    branch: row.branch,
    year: row.year,
    createdAt: row.created_at,
  };
}

function mapViolation(row) {
  return {
    id: row.id,
    userId: row.user_id,
    attemptId: row.attempt_id != null ? String(row.attempt_id) : null,
    testId: row.test_id != null ? String(row.test_id) : null,
    violationType: row.violation_type ?? row.type ?? 'unknown',
    metadata: row.metadata,
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

function mapExamBuilderDraw(row) {
  return {
    id: row.id,
    testType: row.test_type,
    slotKey: row.slot_key,
    topicIds: row.topic_ids ?? [],
    questionIds: row.question_ids ?? [],
    facultyExamRequestId: row.faculty_exam_request_id,
    testId: row.test_id != null ? String(row.test_id) : null,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function mapDepartmentGroup(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
  };
}

function mapDepartmentGroupMember(row) {
  return { groupId: row.group_id, department: row.department };
}

function mapRmsetPaper(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    testId: row.test_id,
    topicIds: row.topic_ids ?? [],
    questionsPerTopic: row.questions_per_topic ?? 10,
    durationMinutes: row.duration_minutes ?? 60,
    status: row.status ?? 'draft',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function mapTestQuestion(row) {
  return {
    testId: String(row.test_id),
    questionId: row.question_id,
    sortOrder: row.sort_order ?? 0,
  };
}

function mapTestSection(row) {
  return {
    id: row.id,
    testId: row.test_id,
    name: row.name,
    durationMinutes: row.duration_minutes,
    sortOrder: row.sort_order ?? 0,
    cutoffScore: row.cutoff_score,
    negativeMarking: row.negative_marking ?? 0,
    shuffleQuestions: row.shuffle_questions ?? false,
    createdAt: row.created_at,
  };
}

function mapStudentActiveSession(row) {
  return {
    userId: row.user_id,
    sessionId: row.session_id,
    lockedAt: row.locked_at,
    lastHeartbeat: row.last_heartbeat,
  };
}

function mapCodingSubmission(row) {
  return {
    id: row.id,
    userId: row.user_id,
    questionId: row.question_id,
    language: row.language,
    sourceCode: row.source_code,
    stdin: row.stdin,
    stdout: row.stdout,
    stderr: row.stderr,
    status: row.status ?? 'pending',
    runtimeMs: row.runtime_ms,
    memoryKb: row.memory_kb,
    passedPublic: row.passed_public,
    passedHidden: row.passed_hidden,
    plagiarismHash: row.plagiarism_hash,
    createdAt: row.created_at,
  };
}

async function migrateAuthPasswords() {
  console.log('▶ auth.users password hashes…');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.warn('  Skipped — set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
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
  const tempPassword = process.env.MIGRATION_DEFAULT_PASSWORD;
  if (!tempPassword) {
    console.warn('  Set MIGRATION_DEFAULT_PASSWORD for student temp passwords');
    return;
  }
  const hash = await bcrypt.hash(tempPassword, 12);
  let updated = 0;
  for (const au of users) {
    if (!au.email) continue;
    if (!dryRun) {
      await prisma.user.updateMany({
        where: { email: au.email.toLowerCase() },
        data: { passwordHash: hash },
      });
    }
    updated++;
  }
  console.log(`  ${dryRun ? 'Would update' : 'Updated'} ${updated} passwords`);
}

async function main() {
  console.log(dryRun ? '🔍 DRY RUN — full Supabase → RDS' : '🚀 Full migration Supabase → RDS');

  await copyTable('users', mapUser, prisma.user);
  await copyTable('admin_users', mapAdminUser, prisma.adminUser);
  await copyTable('test_categories', mapTestCategory, prisma.testCategory);
  await copyTable('tests', mapTest, prisma.test);
  await copyTable('questions', mapQuestion, prisma.question);
  await copyTable('question_tags', mapQuestionTag, prisma.questionTag);
  await copyTable('question_tag_links', mapQuestionTagLink, prisma.questionTagLink);
  await copyTable('test_questions', mapTestQuestion, prisma.testQuestion);
  await copyTable('test_sections', mapTestSection, prisma.testSection);
  await copyTable('test_attempts', mapTestAttempt, prisma.testAttempt);
  await copyTable('exam_schedules', mapExamSchedule, prisma.examSchedule);
  await copyTable('faculty_exam_requests', mapFacultyExamRequest, prisma.facultyExamRequest);
  await copyTable('evalora_module_schedules', mapEvalora, prisma.evaloraModuleSchedule);
  await copyTable('exam_slot_roster_entries', mapRosterEntry, prisma.examSlotRosterEntry);
  await copyTable('exam_student_roster', mapExamStudentRoster, prisma.examStudentRoster);
  await copyTable('exam_violations', mapViolation, prisma.examViolation);
  await copyTable('student_dashboard_stats', mapDashboardStat, prisma.studentDashboardStat);
  await copyTable('student_active_sessions', mapStudentActiveSession, prisma.studentActiveSession);
  await copyTable('exam_builder_draws', mapExamBuilderDraw, prisma.examBuilderDraw);
  await copyTable('department_groups', mapDepartmentGroup, prisma.departmentGroup);
  await copyTable('department_group_members', mapDepartmentGroupMember, prisma.departmentGroupMember);
  await copyTable('rmset_papers', mapRmsetPaper, prisma.rmsetPaper);
  await copyTable('coding_submissions', mapCodingSubmission, prisma.codingSubmission);

  await migrateAuthPasswords();

  console.log('✅ Full migration complete');
  await source.end();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
