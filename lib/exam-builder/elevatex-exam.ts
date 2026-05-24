import { ELEVATEX_EXAM_NAME, ELEVATEX_TEST_ID, isElevateXTestId } from '@/lib/elevatex';
import type { FacultyMcqQuestion } from '@/lib/faculty-exams';

export const ELEVATEX_BUILDER_TEST_TYPE_ID = 'elevatex';

export function isElevateXBuilderTestType(testType: string | null | undefined): boolean {
  return String(testType ?? '').trim().toLowerCase() === ELEVATEX_BUILDER_TEST_TYPE_ID;
}

/** Stored on faculty_exam_requests so publish can skip MCQ creation. */
export const ELEVATEX_PLACEHOLDER_QUESTIONS: FacultyMcqQuestion[] = [
  {
    question_text: `${ELEVATEX_EXAM_NAME} — fixed 6-section paper (technical, aptitude, logic, IQ, psychometric, speaking).`,
    option_a: 'N/A',
    option_b: 'N/A',
    option_c: 'N/A',
    option_d: 'N/A',
    correct_answer: 'A',
  },
];

export function studentTakeUrlForTestId(testId: string): string {
  return isElevateXTestId(testId) ? '/placement/assessment' : `/tests/take/${testId}`;
}

export { ELEVATEX_TEST_ID };
