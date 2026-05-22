import { formatAttemptStatus } from '@/lib/attempt-status';
import { formatScorePercentLabel } from '@/lib/format-score';
import type { TableReportPayload } from '@/lib/reports/table-report';
import type { FacultyExamRequest } from '@/lib/faculty-exams';

export type FacultyDashboardCardKey =
  | 'students_in_department'
  | 'students_with_attempts'
  | 'total_attempts'
  | 'approval_queue';

export type FacultyPerformanceStudent = {
  id: string;
  email: string;
  full_name: string | null;
  branch: string | null;
  academic_year: string | null;
  attempts_count: number;
  completed_count: number;
  avg_score: number;
  best_score: number;
  last_attempt_at: string | null;
  recent: Array<{
    id: string;
    test_title: string;
    topic: string | null;
    score: number | null;
    status: string | null;
    completed_at: string | null;
    created_at: string | null;
    is_elevatex?: boolean;
  }>;
};

export type FacultyPerformanceSummary = {
  students_in_department?: number;
  students_with_attempts?: number;
  total_attempts?: number;
  total_completed?: number;
  overall_avg?: number;
  pass_rate?: number;
};

export type FacultyPerformanceExamStat = {
  exam_id: string;
  test_id: string;
  title: string;
  topic: string | null;
  target_years: string[];
  attempts: number;
  completed: number;
  avg_score: number;
  pass_rate: number;
};

export type FacultyReportContext = {
  department: string;
  summary: FacultyPerformanceSummary;
  students: FacultyPerformanceStudent[];
  examStats: FacultyPerformanceExamStat[];
  examRequests: FacultyExamRequest[];
};

export type FacultyPerformanceCardKey =
  | 'students_in_department'
  | 'students_with_attempts'
  | 'average_score'
  | 'pass_rate';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function attemptDetailRows(
  students: FacultyPerformanceStudent[],
): Array<Record<string, string | number>> {
  const rows: Array<Record<string, string | number>> = [];
  for (const s of students) {
    for (const a of s.recent) {
      rows.push({
        student_name: s.full_name || '—',
        email: s.email,
        branch: s.branch || '—',
        year: s.academic_year || '—',
        test_title: a.test_title,
        topic: a.topic || '—',
        score: a.score != null ? formatScorePercentLabel(a.score) : '—',
        status: formatAttemptStatus(a.status),
        completed_at: fmtDate(a.completed_at ?? a.created_at),
        elevatex: a.is_elevatex ? 'Yes' : 'No',
      });
    }
  }
  return rows.sort((a, b) =>
    String(b.completed_at).localeCompare(String(a.completed_at)),
  );
}

export function buildFacultyDashboardCardReport(
  key: FacultyDashboardCardKey,
  ctx: FacultyReportContext,
): TableReportPayload {
  const generated = new Date().toLocaleString();
  const dept = ctx.department;

  switch (key) {
    case 'students_in_department':
      return {
        title: 'Students in your branch',
        subtitle: `${dept} — all enrolled learners`,
        generatedAt: generated,
        summaryLines: [`Total: ${ctx.summary.students_in_department ?? ctx.students.length}`],
        columns: [
          { key: 'name', header: 'Name' },
          { key: 'email', header: 'Email' },
          { key: 'branch', header: 'Branch' },
          { key: 'year', header: 'Year' },
          { key: 'attempts', header: 'Attempts', align: 'right' },
          { key: 'completed', header: 'Completed', align: 'right' },
        ],
        rows: ctx.students.map((s) => ({
          name: s.full_name || '—',
          email: s.email,
          branch: s.branch || '—',
          year: s.academic_year || '—',
          attempts: s.attempts_count,
          completed: s.completed_count,
        })),
      };

    case 'students_with_attempts':
      return {
        title: 'Students who attended exams',
        subtitle: `${dept} — at least one attempt`,
        generatedAt: generated,
        summaryLines: [`Count: ${ctx.summary.students_with_attempts ?? 0}`],
        columns: [
          { key: 'name', header: 'Name' },
          { key: 'email', header: 'Email' },
          { key: 'year', header: 'Year' },
          { key: 'attempts', header: 'Attempts', align: 'right' },
          { key: 'avg', header: 'Avg %', align: 'right' },
          { key: 'best', header: 'Best %', align: 'right' },
          { key: 'last', header: 'Last attempt' },
        ],
        rows: ctx.students
          .filter((s) => s.attempts_count > 0)
          .map((s) => ({
            name: s.full_name || '—',
            email: s.email,
            year: s.academic_year || '—',
            attempts: s.attempts_count,
            avg: formatScorePercentLabel(s.avg_score),
            best: formatScorePercentLabel(s.best_score),
            last: fmtDate(s.last_attempt_at),
          })),
      };

    case 'total_attempts':
      return {
        title: 'All department test attempts',
        subtitle: `${dept} — recent attempts per student`,
        generatedAt: generated,
        summaryLines: [`Total attempts: ${ctx.summary.total_attempts ?? 0}`],
        columns: [
          { key: 'student_name', header: 'Student' },
          { key: 'email', header: 'Email' },
          { key: 'branch', header: 'Branch' },
          { key: 'year', header: 'Year' },
          { key: 'test_title', header: 'Test' },
          { key: 'topic', header: 'Topic' },
          { key: 'score', header: 'Score %', align: 'right' },
          { key: 'status', header: 'Status' },
          { key: 'completed_at', header: 'Completed' },
          { key: 'elevatex', header: 'ElevateX' },
        ],
        rows: attemptDetailRows(ctx.students),
      };

    case 'approval_queue':
      return {
        title: 'Exam approval queue',
        subtitle: 'Your submitted department exams',
        generatedAt: generated,
        summaryLines: [
          `Pending: ${ctx.examRequests.filter((r) => r.status === 'pending').length}`,
          `Approved: ${ctx.examRequests.filter((r) => r.status === 'approved').length}`,
          `Rejected: ${ctx.examRequests.filter((r) => r.status === 'rejected').length}`,
        ],
        columns: [
          { key: 'title', header: 'Title' },
          { key: 'topic', header: 'Topic' },
          { key: 'branches', header: 'Branches' },
          { key: 'years', header: 'Years' },
          { key: 'questions', header: 'Questions', align: 'right' },
          { key: 'duration', header: 'Duration (min)', align: 'right' },
          { key: 'status', header: 'Status' },
        ],
        rows: ctx.examRequests.map((r) => ({
          title: r.title,
          topic: r.topic || '—',
          branches: [r.department, ...(r.target_branches ?? [])].join(', '),
          years: (r.target_years ?? []).join(', '),
          questions: Array.isArray(r.questions_json) ? r.questions_json.length : 0,
          duration: r.duration_minutes,
          status: r.status,
        })),
      };

    default:
      return {
        title: 'Report',
        generatedAt: generated,
        columns: [],
        rows: [],
      };
  }
}

export function buildFacultyPerformanceCardReport(
  key: FacultyPerformanceCardKey,
  ctx: FacultyReportContext,
): TableReportPayload {
  const generated = new Date().toLocaleString();
  const dept = ctx.department;

  switch (key) {
    case 'students_in_department':
      return buildFacultyDashboardCardReport('students_in_department', ctx);

    case 'students_with_attempts':
      return buildFacultyDashboardCardReport('students_with_attempts', ctx);

    case 'average_score':
      return {
        title: 'Student scores — department average',
        subtitle: `${dept} · mean ${formatScorePercentLabel(ctx.summary.overall_avg ?? 0)}`,
        generatedAt: generated,
        summaryLines: [
          `Overall average: ${formatScorePercentLabel(ctx.summary.overall_avg ?? 0)}`,
          `Completed attempts: ${ctx.summary.total_completed ?? 0}`,
        ],
        columns: [
          { key: 'name', header: 'Name' },
          { key: 'email', header: 'Email' },
          { key: 'year', header: 'Year' },
          { key: 'attempts', header: 'Attempts', align: 'right' },
          { key: 'completed', header: 'Completed', align: 'right' },
          { key: 'avg', header: 'Avg %', align: 'right' },
          { key: 'best', header: 'Best %', align: 'right' },
        ],
        rows: ctx.students
          .filter((s) => s.attempts_count > 0)
          .map((s) => ({
            name: s.full_name || '—',
            email: s.email,
            year: s.academic_year || '—',
            attempts: s.attempts_count,
            completed: s.completed_count,
            avg: formatScorePercentLabel(s.avg_score),
            best: formatScorePercentLabel(s.best_score),
          })),
      };

    case 'pass_rate':
      return {
        title: 'Pass rate detail (≥ 40%)',
        subtitle: `${dept} — exams and ElevateX in your branch`,
        generatedAt: generated,
        summaryLines: [`Pass rate: ${formatScorePercentLabel(ctx.summary.pass_rate ?? 0)}`],
        columns: [
          { key: 'exam', header: 'Exam / test' },
          { key: 'topic', header: 'Topic' },
          { key: 'attempts', header: 'Attempts', align: 'right' },
          { key: 'completed', header: 'Completed', align: 'right' },
          { key: 'avg', header: 'Avg %', align: 'right' },
          { key: 'pass_rate', header: 'Pass rate %', align: 'right' },
        ],
        rows: ctx.examStats.map((e) => ({
          exam: e.title,
          topic: e.topic || '—',
          attempts: e.attempts,
          completed: e.completed,
          avg: formatScorePercentLabel(e.avg_score),
          pass_rate: formatScorePercentLabel(e.pass_rate),
        })),
      };

    default:
      return buildFacultyDashboardCardReport('students_in_department', ctx);
  }
}
