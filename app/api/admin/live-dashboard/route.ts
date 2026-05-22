import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { loadAllAttemptsRollup } from '@/lib/admin/attempts-rollup';
import {
  buildAllLiveExamBoards,
  buildAllLiveWritingActivity,
  buildLiveExamBoard,
  listLiveExamSchedules,
} from '@/lib/admin/live-dashboard-data';

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

  const liveSchedules = await listLiveExamSchedules(admin);
  if (liveSchedules.length === 0) {
    return NextResponse.json({ live: false, schedules: [], board: null });
  }

  const schedule =
    (scheduleId ? liveSchedules.find((s) => s.id === scheduleId) : null) ?? liveSchedules[0];

  const { attempts } = await loadAllAttemptsRollup(admin);
  const [boards, writing_now] = await Promise.all([
    buildAllLiveExamBoards(admin, liveSchedules, attempts),
    buildAllLiveWritingActivity(admin, liveSchedules, attempts),
  ]);

  const board =
    boards.find((b) => b.schedule.id === schedule.id) ??
    boards[0] ??
    (await buildLiveExamBoard(admin, schedule, attempts));

  return NextResponse.json({
    live: true,
    schedules: liveSchedules,
    boards,
    board,
    writing_now,
    refreshed_at: new Date().toISOString(),
  });
}
