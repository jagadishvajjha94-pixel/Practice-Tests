import { prisma } from '@/lib/prisma';
import { isScheduleWindowOpen, type ExamScheduleRow } from '@/lib/exam-schedule';
import { testIdsMatch } from '@/lib/test-attempts';

function mapSchedule(row: {
  id: string;
  testId: string | null;
  title: string | null;
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
  targetDepartments: unknown;
  targetYears: unknown;
  slotNumber: number | null;
  createdAt: Date;
  updatedAt: Date;
}): ExamScheduleRow {
  const nowIso = new Date().toISOString();
  return {
    id: row.id,
    title: row.title ?? 'Exam',
    description: null,
    notice: null,
    faculty_exam_request_id: null,
    test_id: row.testId ?? '',
    status: row.status === 'live' || row.status === 'ended' ? row.status : 'scheduled',
    starts_at: row.startsAt?.toISOString() ?? nowIso,
    ends_at: row.endsAt?.toISOString() ?? null,
    target_departments: Array.isArray(row.targetDepartments) ? (row.targetDepartments as string[]) : [],
    target_years: Array.isArray(row.targetYears) ? (row.targetYears as string[]) : [],
    slot_number: row.slotNumber,
    slot_capacity: null,
    created_by: null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function getLiveExamAccessPolicyPrisma(testId: string): Promise<{
  loginRequired: boolean;
  liveExamTitle: string | null;
}> {
  const trimmed = testId.trim();
  if (!trimmed) return { loginRequired: false, liveExamTitle: null };

  const rows = await prisma.examSchedule.findMany({
    where: { status: { not: 'ended' } },
    take: 500,
  });

  const schedules = rows.map(mapSchedule).filter((s) => testIdsMatch(s.test_id, trimmed));
  const now = Date.now();
  const live = schedules.filter((s) => isScheduleWindowOpen(s, now));

  if (!live.length) {
    return { loginRequired: false, liveExamTitle: null };
  }

  return {
    loginRequired: true,
    liveExamTitle: live[0]?.title ?? null,
  };
}
