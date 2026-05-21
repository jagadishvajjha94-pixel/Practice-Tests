import type { SupabaseClient } from '@supabase/supabase-js';
import { rollNumberFromUser } from '@/lib/admin/roll-number';
import type { RollupAttempt } from '@/lib/admin/attempts-rollup';
import { isScheduleLiveNow, type ExamScheduleRow } from '@/lib/exam-schedule';
import { resolveStoredPercent, testIdsMatch } from '@/lib/test-attempts';

export type LiveBoardEntry = {
  attempt_id: string;
  user_id: string;
  roll_number: string;
  student_name: string;
  score: number;
  status: string;
  submitted_at: string | null;
  updated_at: string;
  rank: number;
};

export type LiveExamBoard = {
  schedule: ExamScheduleRow;
  test_title: string;
  entries: LiveBoardEntry[];
  submitted_count: number;
  in_progress_count: number;
};

/** Student currently in an exam (not yet submitted), tagged with which live test. */
export type LiveWritingEntry = LiveBoardEntry & {
  schedule_id: string;
  schedule_title: string;
  test_title: string;
};

export async function buildAllLiveWritingActivity(
  admin: SupabaseClient,
  schedules: ExamScheduleRow[],
  preloadedAttempts?: RollupAttempt[],
): Promise<LiveWritingEntry[]> {
  const rows: LiveWritingEntry[] = [];

  for (const schedule of schedules) {
    const board = await buildLiveExamBoard(admin, schedule, preloadedAttempts);
    for (const entry of board.entries) {
      if (entry.submitted_at) continue;
      rows.push({
        ...entry,
        schedule_id: schedule.id,
        schedule_title: schedule.title,
        test_title: board.test_title,
      });
    }
  }

  return rows.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/^department\s*·\s*/i, '')
    .trim();
}

function titleKeysForSchedule(schedule: ExamScheduleRow, facultyTitle?: string | null): string[] {
  const keys = new Set<string>();
  const add = (value: string | null | undefined) => {
    const n = normalizeTitle(String(value ?? ''));
    if (n) keys.add(n);
  };
  add(schedule.title);
  add(facultyTitle);
  if (facultyTitle) add(`department · ${facultyTitle}`);
  return Array.from(keys);
}

function attemptMatchesLiveSchedule(
  attempt: RollupAttempt,
  schedule: ExamScheduleRow,
  titleKeys: string[],
): boolean {
  const scheduleTestId = String(schedule.test_id ?? '');
  if (scheduleTestId && attempt.test_id && testIdsMatch(attempt.test_id, scheduleTestId)) {
    return true;
  }

  const attemptTitle = normalizeTitle(attempt.test_name);
  if (!attemptTitle) return false;

  for (const key of titleKeys) {
    if (!key) continue;
    if (attemptTitle === key) return true;
    if (attemptTitle.includes(key) || key.includes(attemptTitle)) return true;
  }

  const startMs = new Date(schedule.starts_at).getTime();
  const attemptMs = new Date(attempt.created_at).getTime();
  if (!Number.isNaN(startMs) && !Number.isNaN(attemptMs) && attemptMs >= startMs - 120_000) {
    const scheduleTitle = normalizeTitle(schedule.title);
    if (scheduleTitle && (attemptTitle.includes(scheduleTitle) || scheduleTitle.includes(attemptTitle))) {
      return true;
    }
  }

  return false;
}

function rowToRollupAttempt(
  row: Record<string, unknown>,
  fallbackTitle: string,
): RollupAttempt {
  const created = String(row.created_at ?? row.started_at ?? new Date().toISOString());
  return {
    id: String(row.id),
    user_id: String(row.user_id ?? ''),
    test_id: row.test_id != null ? String(row.test_id) : null,
    test_name: String(row.test_title ?? fallbackTitle),
    score: resolveStoredPercent(
      row.percentage_score != null ? Number(row.percentage_score) : null,
      row.score != null ? Number(row.score) : null,
      row.total_score != null ? Number(row.total_score) : null,
    ),
    status: String(row.status ?? 'completed'),
    created_at: created,
    completed_at: row.completed_at ? String(row.completed_at) : null,
    time_taken: row.time_taken != null ? Number(row.time_taken) : null,
    source: 'test_attempts',
  };
}

async function loadAttemptsForSchedule(
  admin: SupabaseClient,
  schedule: ExamScheduleRow,
  titleKeys: string[],
  preloaded?: RollupAttempt[],
): Promise<RollupAttempt[]> {
  const byId = new Map<string, RollupAttempt>();
  const add = (row: RollupAttempt) => {
    if (attemptMatchesLiveSchedule(row, schedule, titleKeys)) {
      byId.set(row.id, row);
    }
  };

  for (const row of preloaded ?? []) add(row);

  const since = new Date(schedule.starts_at);
  since.setMinutes(since.getMinutes() - 5);
  const sinceIso = since.toISOString();

  const scheduleTestId = String(schedule.test_id ?? '').trim();
  let query = admin
    .from('test_attempts')
    .select('*')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(500);

  if (scheduleTestId) {
    const { data: byTestId } = await admin
      .from('test_attempts')
      .select('*')
      .eq('test_id', scheduleTestId)
      .order('created_at', { ascending: false })
      .limit(300);
    for (const row of byTestId ?? []) {
      add(rowToRollupAttempt(row as Record<string, unknown>, schedule.title));
    }
  }

  const { data: recentRows } = await query;
  for (const row of recentRows ?? []) {
    add(rowToRollupAttempt(row as Record<string, unknown>, schedule.title));
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function listLiveExamSchedules(admin: SupabaseClient): Promise<ExamScheduleRow[]> {
  const { data } = await admin
    .from('exam_schedules')
    .select('*')
    .eq('status', 'live')
    .order('starts_at', { ascending: false });

  const now = Date.now();
  return ((data ?? []) as ExamScheduleRow[]).filter((row) => isScheduleLiveNow(row, now));
}

export async function buildLiveExamBoard(
  admin: SupabaseClient,
  schedule: ExamScheduleRow,
  preloadedAttempts?: RollupAttempt[],
): Promise<LiveExamBoard> {
  const testId = String(schedule.test_id);

  let facultyTitle: string | null = null;
  if (schedule.faculty_exam_request_id) {
    const { data: facultyRow } = await admin
      .from('faculty_exam_requests')
      .select('title, published_test_id')
      .eq('id', schedule.faculty_exam_request_id)
      .maybeSingle();
    facultyTitle = (facultyRow?.title as string | null) ?? null;
  }

  const titleKeys = titleKeysForSchedule(schedule, facultyTitle);
  const matched = await loadAttemptsForSchedule(admin, schedule, titleKeys, preloadedAttempts);

  const userIds = [...new Set(matched.map((a) => a.user_id))];
  const usersById = new Map<
    string,
    { full_name: string | null; email: string; metadata?: Record<string, unknown> }
  >();

  if (userIds.length) {
    const { data: users } = await admin
      .from('users')
      .select('id, email, full_name')
      .in('id', userIds);

    for (const u of users ?? []) {
      usersById.set(u.id as string, {
        email: String(u.email ?? ''),
        full_name: (u.full_name as string | null) ?? null,
      });
    }

    for (const uid of userIds) {
      if (usersById.has(uid)) continue;
      const { data: authUser } = await admin.auth.admin.getUserById(uid);
      if (authUser?.user) {
        usersById.set(uid, {
          email: authUser.user.email ?? '',
          full_name:
            (authUser.user.user_metadata?.full_name as string | undefined) ??
            (authUser.user.user_metadata?.name as string | undefined) ??
            null,
          metadata: authUser.user.user_metadata as Record<string, unknown>,
        });
      }
    }
  }

  let testTitle = schedule.title;
  const { data: testRow } = await admin
    .from('tests')
    .select('title, name')
    .eq('id', testId)
    .maybeSingle();
  if (testRow) {
    testTitle = String(testRow.title ?? testRow.name ?? schedule.title);
  } else if (facultyTitle) {
    testTitle = facultyTitle;
  }

  const sorted = [...matched].sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (scoreDiff !== 0) return scoreDiff;
    const bt = new Date(b.completed_at ?? b.created_at).getTime();
    const at = new Date(a.completed_at ?? a.created_at).getTime();
    return at - bt;
  });

  const entries: LiveBoardEntry[] = sorted.map((a, index) => {
    const user = usersById.get(a.user_id);
    const email = user?.email ?? '';
    const isDone =
      a.status === 'completed' ||
      a.status === 'submitted' ||
      Boolean(a.completed_at);
    return {
      attempt_id: a.id,
      user_id: a.user_id,
      roll_number: rollNumberFromUser(email, user?.metadata),
      student_name: user?.full_name || email || 'Student',
      score: a.score,
      status: isDone ? 'completed' : a.status,
      submitted_at: isDone ? a.completed_at ?? a.created_at : null,
      updated_at: a.completed_at ?? a.created_at,
      rank: index + 1,
    };
  });

  return {
    schedule,
    test_title: testTitle,
    entries,
    submitted_count: entries.filter((e) => e.submitted_at).length,
    in_progress_count: entries.filter((e) => !e.submitted_at).length,
  };
}
