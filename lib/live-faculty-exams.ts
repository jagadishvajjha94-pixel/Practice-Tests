import { examMatchesDepartment } from '@/lib/department-match';
import { academicYearInList } from '@/lib/academic-year-match';
import {
  isFacultyExamLiveForStudent,
  isScheduleLiveNow,
  type ExamScheduleRow,
  type StudentExamSchedule,
} from '@/lib/exam-schedule';
import { studentTakeUrlForTestId } from '@/lib/exam-builder/elevatex-exam';

type ApprovedRequest = {
  id: string;
  title: string;
  topic: string | null;
  description: string | null;
  duration_minutes: number;
  target_years: string[];
  target_branches: string[];
  published_test_id: string;
  department: string;
};

/** Live faculty exams for a student, including when schedule targeting is loose. */
export function listLiveFacultyExamsForStudent(
  requests: ApprovedRequest[],
  schedules: ExamScheduleRow[],
  department: string,
  year: string,
  extras?: Map<string, { duration_minutes?: number; topic?: string | null }>,
): StudentExamSchedule[] {
  const live: StudentExamSchedule[] = [];
  const seenTestIds = new Set<string>();

  for (const req of requests) {
    const years = req.target_years ?? [];
    if (!academicYearInList(year, years)) continue;
    if (!examMatchesDepartment(req, department)) continue;
    if (!isFacultyExamLiveForStudent(req.id, schedules, department, year)) continue;

    const testId = String(req.published_test_id);
    if (!testId || seenTestIds.has(testId)) continue;
    seenTestIds.add(testId);

    const related = schedules.filter((s) => s.faculty_exam_request_id === req.id);
    const liveSchedule = related.find((s) => isScheduleLiveNow(s)) ?? related[0];

    const meta = extras?.get(req.id);
    live.push({
      id: liveSchedule?.id ?? req.id,
      title: req.title,
      description: req.description,
      notice: liveSchedule?.notice ?? null,
      faculty_exam_request_id: req.id,
      test_id: testId,
      status: 'live',
      starts_at: liveSchedule?.starts_at ?? new Date().toISOString(),
      ends_at: liveSchedule?.ends_at ?? null,
      target_departments: liveSchedule?.target_departments ?? [
        req.department,
        ...(req.target_branches ?? []),
      ],
      target_years: liveSchedule?.target_years ?? years,
      created_by: liveSchedule?.created_by ?? null,
      created_at: liveSchedule?.created_at ?? new Date().toISOString(),
      updated_at: liveSchedule?.updated_at ?? new Date().toISOString(),
      kind: 'live',
      take_url: studentTakeUrlForTestId(testId),
      duration_minutes: meta?.duration_minutes ?? req.duration_minutes ?? null,
      topic: meta?.topic ?? req.topic ?? null,
    });
  }

  return live;
}
