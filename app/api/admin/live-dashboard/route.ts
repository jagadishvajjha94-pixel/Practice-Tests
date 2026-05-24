import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import {
  buildAllLiveExamBoards,
  buildAllLiveWritingActivity,
  buildLiveExamBoard,
  listLiveExamSchedules,
  listRecentlyEndedExamSchedules,
} from '@/lib/admin/live-dashboard-data';
import { loadScheduleForReport } from '@/lib/admin/load-schedule-for-report';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get('scheduleId')?.trim() ?? '';

  const [liveSchedules, endedSchedules] = await Promise.all([
    listLiveExamSchedules(admin),
    listRecentlyEndedExamSchedules(admin),
  ]);

  const [boards, endedBoards, writing_now] = await Promise.all([
    liveSchedules.length ? buildAllLiveExamBoards(admin, liveSchedules) : Promise.resolve([]),
    endedSchedules.length ? buildAllLiveExamBoards(admin, endedSchedules) : Promise.resolve([]),
    liveSchedules.length ? buildAllLiveWritingActivity(admin, liveSchedules) : Promise.resolve([]),
  ]);

  const schedule =
    (scheduleId ? liveSchedules.find((s) => s.id === scheduleId) : null) ??
    (scheduleId ? endedSchedules.find((s) => s.id === scheduleId) : null) ??
    liveSchedules[0] ??
    endedSchedules[0] ??
    null;

  const board =
    (schedule
      ? [...boards, ...endedBoards].find((b) => b.schedule.id === schedule.id)
      : null) ??
    boards[0] ??
    endedBoards[0] ??
    (schedule ? await buildLiveExamBoard(admin, schedule) : null);

  const ended_reports = await Promise.all(
    endedSchedules.map(async (s) => {
      const loaded = await loadScheduleForReport(admin, s.id);
      return {
        schedule_id: s.id,
        slot_number: s.slot_number ?? null,
        title: s.title,
        test_id: String(s.test_id ?? ''),
        exam_type: loaded?.exam_type ?? 'department',
        ends_at: s.ends_at,
      };
    }),
  );

  return NextResponse.json({
    live: liveSchedules.length > 0,
    schedules: liveSchedules,
    boards,
    ended_schedules: endedSchedules,
    ended_boards: endedBoards,
    ended_reports,
    board,
    writing_now,
    refreshed_at: new Date().toISOString(),
  });
}
