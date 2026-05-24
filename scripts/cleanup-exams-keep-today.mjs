/**
 * Keep faculty/admin exams from today (IST) and delete older exam data.
 *
 * Usage:
 *   node scripts/cleanup-exams-keep-today.mjs           # dry-run (preview)
 *   node scripts/cleanup-exams-keep-today.mjs --apply   # delete for real
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

function startOfTodayIstIso(now = new Date()) {
  const dateIst = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return new Date(`${dateIst}T00:00:00+05:30`).toISOString();
}

function isOnOrAfterTodayIst(iso, startIst) {
  if (!iso) return false;
  return new Date(iso).getTime() >= new Date(startIst).getTime();
}

function protectTestId(testId) {
  const id = String(testId ?? '').trim().toLowerCase();
  if (!id) return true;
  if (id === 'placement_full') return true;
  if (id.startsWith('placement-')) return true;
  return false;
}

function shouldKeepFacultyRequest(row, startIst) {
  return (
    isOnOrAfterTodayIst(row.created_at, startIst) ||
    isOnOrAfterTodayIst(row.reviewed_at, startIst) ||
    isOnOrAfterTodayIst(row.updated_at, startIst)
  );
}

async function deleteByIds(supabase, table, column, ids) {
  if (!ids.length) return null;
  const { error } = await supabase.from(table).delete().in(column, ids);
  return error?.message ?? null;
}

async function countByIds(supabase, table, column, ids) {
  if (!ids.length) return 0;
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .in(column, ids);
  if (error) return 0;
  return count ?? 0;
}

async function cleanupExamsKeepToday(supabase, { dryRun = true, now = new Date() } = {}) {
  const startIst = startOfTodayIstIso(now);
  const summary = {
    keepDateIst: startIst.slice(0, 10),
    dryRun,
    keptFacultyRequestIds: [],
    deletedFacultyRequestIds: [],
    deletedScheduleIds: [],
    deletedTestIds: [],
    deletedAttemptIds: [],
    deletedSlotRosterRows: 0,
    deletedStudentRosterRows: 0,
    deletedBuilderDrawRows: 0,
    deletedQuestionRows: 0,
    deletedEvaloraScheduleIds: [],
    errors: [],
  };

  const { data: facultyRows, error: facultyErr } = await supabase
    .from('faculty_exam_requests')
    .select('id, published_test_id, created_at, reviewed_at, updated_at, title, status');

  if (facultyErr) {
    summary.errors.push(`faculty_exam_requests: ${facultyErr.message}`);
    return summary;
  }

  const keepFacultyIds = new Set();
  const deleteFacultyIds = [];
  const deleteTestIds = new Set();

  for (const row of facultyRows ?? []) {
    const id = String(row.id);
    if (shouldKeepFacultyRequest(row, startIst)) {
      keepFacultyIds.add(id);
      summary.keptFacultyRequestIds.push({ id, title: row.title, status: row.status });
    } else {
      deleteFacultyIds.push(id);
      if (row.published_test_id && !protectTestId(row.published_test_id)) {
        deleteTestIds.add(String(row.published_test_id));
      }
    }
  }
  summary.deletedFacultyRequestIds = deleteFacultyIds;

  const { data: scheduleRows, error: schedErr } = await supabase
    .from('exam_schedules')
    .select('id, faculty_exam_request_id, test_id, title, created_at, updated_at');

  if (schedErr) {
    summary.errors.push(`exam_schedules: ${schedErr.message}`);
  } else {
    const deleteScheduleIds = [];
    for (const row of scheduleRows ?? []) {
      const requestId = row.faculty_exam_request_id ? String(row.faculty_exam_request_id) : '';
      const keepByRequest = requestId && keepFacultyIds.has(requestId);
      const keepByDate =
        isOnOrAfterTodayIst(row.created_at, startIst) ||
        isOnOrAfterTodayIst(row.updated_at, startIst);
      if (keepByRequest || keepByDate) continue;
      deleteScheduleIds.push(String(row.id));
      if (row.test_id && !protectTestId(row.test_id)) {
        deleteTestIds.add(String(row.test_id));
      }
    }
    summary.deletedScheduleIds = deleteScheduleIds;

    summary.deletedStudentRosterRows = await countByIds(
      supabase,
      'exam_student_roster',
      'exam_schedule_id',
      deleteScheduleIds,
    );

    if (!dryRun && deleteScheduleIds.length) {
      const rosterErr = await deleteByIds(
        supabase,
        'exam_student_roster',
        'exam_schedule_id',
        deleteScheduleIds,
      );
      if (rosterErr) summary.errors.push(`exam_student_roster: ${rosterErr}`);
      const schedDelErr = await deleteByIds(supabase, 'exam_schedules', 'id', deleteScheduleIds);
      if (schedDelErr) summary.errors.push(`exam_schedules delete: ${schedDelErr}`);
    }
  }

  if (deleteFacultyIds.length) {
    summary.deletedSlotRosterRows = await countByIds(
      supabase,
      'exam_slot_roster_entries',
      'faculty_exam_request_id',
      deleteFacultyIds,
    );
    summary.deletedBuilderDrawRows = await countByIds(
      supabase,
      'exam_builder_draws',
      'faculty_exam_request_id',
      deleteFacultyIds,
    );

    if (!dryRun) {
      const slotErr = await deleteByIds(
        supabase,
        'exam_slot_roster_entries',
        'faculty_exam_request_id',
        deleteFacultyIds,
      );
      if (slotErr) summary.errors.push(`exam_slot_roster_entries: ${slotErr}`);

      const drawErr = await deleteByIds(
        supabase,
        'exam_builder_draws',
        'faculty_exam_request_id',
        deleteFacultyIds,
      );
      if (drawErr) summary.errors.push(`exam_builder_draws: ${drawErr}`);

      const facultyDelErr = await deleteByIds(
        supabase,
        'faculty_exam_requests',
        'id',
        deleteFacultyIds,
      );
      if (facultyDelErr) summary.errors.push(`faculty_exam_requests delete: ${facultyDelErr}`);
    }
  }

  const testIdsToDelete = [...deleteTestIds].filter((id) => !protectTestId(id));
  summary.deletedTestIds = testIdsToDelete;

  if (testIdsToDelete.length) {
    const { data: attemptRows } = await supabase
      .from('test_attempts')
      .select('id, test_id')
      .in('test_id', testIdsToDelete);

    summary.deletedAttemptIds = (attemptRows ?? []).map((r) => String(r.id));
    summary.deletedQuestionRows = await countByIds(supabase, 'questions', 'test_id', testIdsToDelete);

    if (!dryRun) {
      if (summary.deletedAttemptIds.length) {
        await deleteByIds(supabase, 'exam_violations', 'attempt_id', summary.deletedAttemptIds);
      }
      const attemptErr = await deleteByIds(supabase, 'test_attempts', 'test_id', testIdsToDelete);
      if (attemptErr) summary.errors.push(`test_attempts: ${attemptErr}`);

      await deleteByIds(supabase, 'exam_builder_draws', 'test_id', testIdsToDelete);
      await deleteByIds(supabase, 'test_questions', 'test_id', testIdsToDelete);
      const qErr = await deleteByIds(supabase, 'questions', 'test_id', testIdsToDelete);
      if (qErr) summary.errors.push(`questions: ${qErr}`);
      const testErr = await deleteByIds(supabase, 'tests', 'id', testIdsToDelete);
      if (testErr) summary.errors.push(`tests: ${testErr}`);
    }
  }

  const { data: evaloraRows, error: evaloraErr } = await supabase
    .from('evalora_module_schedules')
    .select('id, title, created_at, updated_at');

  if (evaloraErr) {
    const msg = String(evaloraErr.message ?? '').toLowerCase();
    if (!msg.includes('evalora_module_schedules')) {
      summary.errors.push(`evalora_module_schedules: ${evaloraErr.message}`);
    }
  } else {
    summary.deletedEvaloraScheduleIds = (evaloraRows ?? [])
      .filter(
        (row) =>
          !isOnOrAfterTodayIst(row.created_at, startIst) &&
          !isOnOrAfterTodayIst(row.updated_at, startIst),
      )
      .map((row) => String(row.id));

    if (!dryRun && summary.deletedEvaloraScheduleIds.length) {
      const err = await deleteByIds(
        supabase,
        'evalora_module_schedules',
        'id',
        summary.deletedEvaloraScheduleIds,
      );
      if (err) summary.errors.push(`evalora_module_schedules delete: ${err}`);
    }
  }

  return summary;
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const apply = process.argv.includes('--apply');

if (!url || !serviceKey || serviceKey.includes('YOUR_')) {
  console.error('❌ Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log(`▶ Exam cleanup — keep today (IST: ${startOfTodayIstIso().slice(0, 10)})`);
console.log(apply ? '   Mode: APPLY (will delete)' : '   Mode: dry-run (preview only)');

const summary = await cleanupExamsKeepToday(admin, { dryRun: !apply });

console.log('');
console.log('Kept faculty exam requests:', summary.keptFacultyRequestIds.length);
for (const row of summary.keptFacultyRequestIds) {
  console.log(`  ✅ ${row.title ?? row.id} (${row.status ?? '—'})`);
}
console.log('');
console.log('Would delete / deleted:');
console.log(`  faculty_exam_requests: ${summary.deletedFacultyRequestIds.length}`);
console.log(`  exam_schedules:        ${summary.deletedScheduleIds.length}`);
console.log(`  tests:                 ${summary.deletedTestIds.length}`);
console.log(`  test_attempts:         ${summary.deletedAttemptIds.length}`);
console.log(`  questions:             ${summary.deletedQuestionRows}`);
console.log(`  slot roster rows:      ${summary.deletedSlotRosterRows}`);
console.log(`  student roster rows:   ${summary.deletedStudentRosterRows}`);
console.log(`  evalora schedules:     ${summary.deletedEvaloraScheduleIds.length}`);

if (summary.errors.length) {
  console.log('');
  console.log('Errors:');
  for (const e of summary.errors) console.log(`  ⚠ ${e}`);
}

if (!apply) {
  console.log('');
  console.log('Dry-run only. Re-run with --apply to delete.');
}

process.exit(summary.errors.length && apply ? 1 : 0);
