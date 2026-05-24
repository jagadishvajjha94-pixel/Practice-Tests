import type { SupabaseClient } from '@supabase/supabase-js';
import { rollNumberFromUser } from '@/lib/admin/roll-number';
import type { RollupAttempt } from '@/lib/admin/attempts-rollup';
import {
  isScheduleLiveNow,
  resolveExamScheduleStatus,
  type ExamScheduleRow,
} from '@/lib/exam-schedule';
import { syncExpiredLiveExamSchedules } from '@/lib/exam-schedule-sync';
import type { EvaloraModuleScheduleRow } from '@/lib/evalora/module-schedule';
import { isElevateXModule, isElevateXAttemptTitle, isElevateXTestId } from '@/lib/elevatex';
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

export async function buildAllLiveExamBoards(
  admin: SupabaseClient,
  schedules: ExamScheduleRow[],
  preloadedAttempts?: RollupAttempt[],
): Promise<LiveExamBoard[]> {
  return Promise.all(
    schedules.map((schedule) => buildLiveExamBoard(admin, schedule, preloadedAttempts)),
  );
}

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

function scheduleSessionBounds(schedule: ExamScheduleRow): { startMs: number; endMs: number | null } {
  const startMs = new Date(schedule.starts_at).getTime();
  const endMs = schedule.ends_at ? new Date(schedule.ends_at).getTime() : null;
  return {
    startMs: Number.isNaN(startMs) ? 0 : startMs,
    endMs: endMs !== null && !Number.isNaN(endMs) ? endMs : null,
  };
}

/** Attempt must belong to this scheduled live window — not older runs of the same test. */
function attemptInLiveSession(attempt: RollupAttempt, schedule: ExamScheduleRow): boolean {
  const { startMs, endMs } = scheduleSessionBounds(schedule);
  const attemptMs = new Date(attempt.created_at).getTime();
  if (Number.isNaN(attemptMs)) return false;
  if (attemptMs < startMs - 60_000) return false;
  if (endMs !== null && attemptMs > endMs + 120_000) return false;
  return true;
}

function attemptMatchesLiveSchedule(
  attempt: RollupAttempt,
  schedule: ExamScheduleRow,
  titleKeys: string[],
): boolean {
  if (!attemptInLiveSession(attempt, schedule)) return false;

  const scheduleTestId = String(schedule.test_id ?? '').trim();

  if (scheduleTestId && attempt.test_id && testIdsMatch(attempt.test_id, scheduleTestId)) {
    return true;
  }

  if (isElevateXModule(scheduleTestId) || isElevateXTestId(scheduleTestId)) {
    if (attempt.test_id && isElevateXTestId(attempt.test_id)) return true;
    if (isElevateXAttemptTitle(attempt.test_name)) return true;
  }

  const attemptTitle = normalizeTitle(attempt.test_name);
  if (!attemptTitle) return false;

  for (const key of titleKeys) {
    if (!key) continue;
    if (attemptTitle === key) return true;
    if (attemptTitle.includes(key) || key.includes(attemptTitle)) return true;
  }

  return false;
}

function latestAttemptPerUser(attempts: RollupAttempt[]): RollupAttempt[] {
  const byUser = new Map<string, RollupAttempt>();
  for (const attempt of attempts) {
    const existing = byUser.get(attempt.user_id);
    if (!existing) {
      byUser.set(attempt.user_id, attempt);
      continue;
    }
    const existingMs = new Date(existing.created_at).getTime();
    const attemptMs = new Date(attempt.created_at).getTime();
    if (attemptMs >= existingMs) byUser.set(attempt.user_id, attempt);
  }
  return Array.from(byUser.values());
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
): Promise<RollupAttempt[]> {
  const byId = new Map<string, RollupAttempt>();
  const add = (row: RollupAttempt) => {
    if (attemptMatchesLiveSchedule(row, schedule, titleKeys)) {
      byId.set(row.id, row);
    }
  };

  const sessionStartIso = new Date(scheduleSessionBounds(schedule).startMs - 60_000).toISOString();
  const sessionEndMs = scheduleSessionBounds(schedule).endMs;
  const sessionEndIso =
    sessionEndMs !== null
      ? new Date(sessionEndMs + 120_000).toISOString()
      : null;

  const scheduleTestId = String(schedule.test_id ?? '').trim();

  if (scheduleTestId) {
    let query = admin
      .from('test_attempts')
      .select('*')
      .eq('test_id', scheduleTestId)
      .gte('created_at', sessionStartIso)
      .order('created_at', { ascending: false })
      .limit(500);

    if (sessionEndIso) {
      query = query.lte('created_at', sessionEndIso);
    }

    const { data: byTestId } = await query;
    for (const row of byTestId ?? []) {
      add(rowToRollupAttempt(row as Record<string, unknown>, schedule.title));
    }
  }

  // ElevateX legacy ids (placement-*) during this session only
  if (isElevateXModule(scheduleTestId) || isElevateXTestId(scheduleTestId)) {
    let legacyQuery = admin
      .from('test_attempts')
      .select('*')
      .like('test_id', 'placement-%')
      .gte('created_at', sessionStartIso)
      .order('created_at', { ascending: false })
      .limit(300);

    if (sessionEndIso) {
      legacyQuery = legacyQuery.lte('created_at', sessionEndIso);
    }

    const { data: legacyRows } = await legacyQuery;
    for (const row of legacyRows ?? []) {
      add(rowToRollupAttempt(row as Record<string, unknown>, schedule.title));
    }
  }

  return latestAttemptPerUser(
    Array.from(byId.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    ),
  );
}

function evaloraToExamSchedule(row: EvaloraModuleScheduleRow): ExamScheduleRow {
  const title =
    row.title?.trim() ||
    (isElevateXModule(row.module_key) ? 'ElevateX' : row.module_key.replace(/_/g, ' '));

  return {
    id: row.id,
    title,
    description: null,
    notice: row.notice,
    faculty_exam_request_id: null,
    test_id: row.module_key,
    status: row.status,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    target_departments: row.target_departments ?? [],
    target_years: row.target_years ?? [],
    created_by: null,
    created_at: row.starts_at,
    updated_at: row.starts_at,
  };
}

function isLiveForDashboard(
  schedule: Pick<ExamScheduleRow, 'status' | 'starts_at' | 'ends_at'>,
  now = Date.now(),
): boolean {
  const resolved = resolveExamScheduleStatus(schedule, now);
  return resolved.display === 'live' && resolved.windowOpen && isScheduleLiveNow(schedule, now);
}

export async function listLiveExamSchedules(admin: SupabaseClient): Promise<ExamScheduleRow[]> {
  const now = Date.now();
  const live: ExamScheduleRow[] = [];

  const { data: scheduleRows } = await admin
    .from('exam_schedules')
    .select('*')
    .neq('status', 'ended')
    .order('starts_at', { ascending: false });

  let schedules = (scheduleRows ?? []) as ExamScheduleRow[];
  if (schedules.length > 0) {
    schedules = await syncExpiredLiveExamSchedules(admin, schedules);
  }

  for (const row of schedules) {
    if (isLiveForDashboard(row, now)) live.push(row);
  }

  const { data: evaloraRows } = await admin
    .from('evalora_module_schedules')
    .select('*')
    .neq('status', 'ended')
    .order('starts_at', { ascending: false });

  for (const row of (evaloraRows ?? []) as EvaloraModuleScheduleRow[]) {
    const mapped = evaloraToExamSchedule(row);
    if (isLiveForDashboard(mapped, now)) live.push(mapped);
  }

  return live.sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

export async function buildLiveExamBoard(
  admin: SupabaseClient,
  schedule: ExamScheduleRow,
  _preloadedAttempts?: RollupAttempt[],
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
  const matched = await loadAttemptsForSchedule(admin, schedule, titleKeys);

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
    const aDone =
      a.status === 'completed' || a.status === 'submitted' || Boolean(a.completed_at);
    const bDone =
      b.status === 'completed' || b.status === 'submitted' || Boolean(b.completed_at);
    if (aDone !== bDone) return aDone ? -1 : 1;
    if (aDone && bDone) {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;
      return (
        new Date(a.completed_at ?? a.created_at).getTime() -
        new Date(b.completed_at ?? b.created_at).getTime()
      );
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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
