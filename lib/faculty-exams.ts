import { ACADEMIC_YEARS } from '@/lib/college-brand';

export type FacultyExamStatus = 'pending' | 'approved' | 'rejected';

export type FacultyExamQuestion = {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
};

export type FacultyExamRequest = {
  id: string;
  faculty_user_id: string;
  department: string;
  title: string;
  description: string | null;
  target_years: string[];
  duration_minutes: number;
  questions_json: FacultyExamQuestion[];
  status: FacultyExamStatus;
  admin_note: string | null;
  published_test_id: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export const FACULTY_EXAM_YEARS = [...ACADEMIC_YEARS];

export function parseQuestionsJson(raw: unknown): FacultyExamQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: FacultyExamQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const q = item as Record<string, unknown>;
    const text = String(q.question_text ?? '').trim();
    if (!text) continue;
    const letter = String(q.correct_answer ?? 'A').toUpperCase();
    const correct = ['A', 'B', 'C', 'D'].includes(letter) ? (letter as 'A' | 'B' | 'C' | 'D') : 'A';
    out.push({
      question_text: text,
      option_a: String(q.option_a ?? '').trim(),
      option_b: String(q.option_b ?? '').trim(),
      option_c: String(q.option_c ?? '').trim(),
      option_d: String(q.option_d ?? '').trim(),
      correct_answer: correct,
      explanation: q.explanation ? String(q.explanation) : undefined,
    });
  }
  return out;
}
