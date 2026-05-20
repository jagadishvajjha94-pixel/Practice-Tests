import type { SupabaseClient } from '@supabase/supabase-js';
import { rollNumberFromUser } from '@/lib/admin/roll-number';
import { filterAttemptsForTest } from '@/lib/admin/attempts-rollup';
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

  let attempts = preloadedAttempts;
  if (!attempts) {
    const { data } = await admin
      .from('test_attempts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    attempts = (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      const score = resolveStoredPercent(
        r.percentage_score != null ? Number(r.percentage_score) : null,
        r.score != null ? Number(r.score) : null,
        r.total_score != null ? Number(r.total_score) : null,
      );
      return {
        id: String(r.id),
        user_id: String(r.user_id ?? ''),
        test_id: r.test_id != null ? String(r.test_id) : null,
        test_name: String(r.test_title ?? schedule.title),
        score,
        status: String(r.status ?? 'completed'),
        created_at: String(r.created_at ?? r.started_at ?? new Date().toISOString()),
        completed_at: r.completed_at ? String(r.completed_at) : null,
        time_taken: r.time_taken != null ? Number(r.time_taken) : null,
        source: 'test_attempts' as const,
      };
    });
  } else {
    attempts = filterAttemptsForTest(attempts, testId);
  }

  const matched = (attempts ?? []).filter(
    (a) => a.test_id && testIdsMatch(a.test_id, testId),
  );

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
    const isDone = a.status === 'completed' || a.status === 'submitted' || Boolean(a.completed_at);
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
