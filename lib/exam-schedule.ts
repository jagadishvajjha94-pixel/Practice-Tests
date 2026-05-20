import { departmentsMatch } from '@/lib/faculty/department-match';

export type ExamScheduleStatus = 'scheduled' | 'live' | 'ended';

export type ExamScheduleRow = {
  id: string;
  title: string;
  description: string | null;
  notice: string | null;
  faculty_exam_request_id: string | null;
  test_id: string;
  status: ExamScheduleStatus;
  starts_at: string;
  ends_at: string | null;
  target_departments: string[];
  target_years: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentExamSchedule = ExamScheduleRow & {
  kind: 'live' | 'upcoming';
  take_url: string;
  duration_minutes?: number | null;
  topic?: string | null;
};

export function scheduleMatchesStudent(
  schedule: Pick<ExamScheduleRow, 'target_departments' | 'target_years'>,
  department: string,
  year: string,
): boolean {
  const years = schedule.target_years ?? [];
  if (years.length > 0 && !years.includes(year)) return false;

  const depts = schedule.target_departments ?? [];
  if (depts.length === 0) return true;
  return depts.some((d) => departmentsMatch(d, department));
}

export function isScheduleLiveNow(
  schedule: Pick<ExamScheduleRow, 'status' | 'starts_at' | 'ends_at'>,
  now = Date.now(),
): boolean {
  if (schedule.status !== 'live') return false;
  const start = new Date(schedule.starts_at).getTime();
  if (Number.isNaN(start) || now < start) return false;
  if (!schedule.ends_at) return true;
  const end = new Date(schedule.ends_at).getTime();
  return !Number.isNaN(end) && now <= end;
}

export function isScheduleUpcoming(
  schedule: Pick<ExamScheduleRow, 'status' | 'starts_at'>,
  now = Date.now(),
): boolean {
  if (schedule.status === 'ended') return false;
  if (schedule.status === 'live') return false;
  const start = new Date(schedule.starts_at).getTime();
  return !Number.isNaN(start) && start > now;
}

export function partitionSchedulesForStudent(
  rows: ExamScheduleRow[],
  department: string,
  year: string,
  extras?: Map<string, { duration_minutes?: number; topic?: string | null }>,
): { live: StudentExamSchedule[]; upcoming: StudentExamSchedule[] } {
  const now = Date.now();
  const live: StudentExamSchedule[] = [];
  const upcoming: StudentExamSchedule[] = [];

  for (const row of rows) {
    if (!scheduleMatchesStudent(row, department, year)) continue;

    const meta = row.faculty_exam_request_id
      ? extras?.get(row.faculty_exam_request_id)
      : undefined;

    const base: StudentExamSchedule = {
      ...row,
      kind: 'live',
      take_url: `/tests/take/${row.test_id}`,
      duration_minutes: meta?.duration_minutes ?? null,
      topic: meta?.topic ?? null,
    };

    if (isScheduleLiveNow(row, now)) {
      live.push({ ...base, kind: 'live' });
    } else if (isScheduleUpcoming(row, now)) {
      upcoming.push({ ...base, kind: 'upcoming' });
    }
  }

  live.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  upcoming.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  return { live, upcoming };
}

/** If a faculty exam has a schedule row, it is only accessible when live. */
export function facultyExamIdsGatedBySchedule(schedules: ExamScheduleRow[]): Set<string> {
  const ids = new Set<string>();
  for (const s of schedules) {
    if (s.faculty_exam_request_id) ids.add(s.faculty_exam_request_id);
  }
  return ids;
}

export function isFacultyExamLiveForStudent(
  facultyExamRequestId: string,
  schedules: ExamScheduleRow[],
  department: string,
  year: string,
): boolean {
  const related = schedules.filter((s) => s.faculty_exam_request_id === facultyExamRequestId);
  if (related.length === 0) return true;
  return related.some(
    (s) => scheduleMatchesStudent(s, department, year) && isScheduleLiveNow(s),
  );
}
