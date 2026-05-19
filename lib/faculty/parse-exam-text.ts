import type { FacultyExamQuestion } from '@/lib/faculty-exams';

export type ParseExamResult = {
  questions: FacultyExamQuestion[];
  warnings: string[];
};

const OPTION_LINE =
  /^\s*(?:\(?([A-Da-d])\)?|[\(\[]?([A-Da-d])[\)\].:\-])\s+(.+)$/i;
const ANSWER_LINE = /(?:^|\n)\s*(?:answer|ans|correct(?:\s+answer)?)\s*[:\-]?\s*([A-Da-d])\b/i;

function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitQuestionBlocks(text: string): string[] {
  const parts = text.split(
    /(?=(?:^|\n)\s*(?:(?:Q(?:uestion)?\s*)?\d{1,3}[\.\):\-]\s+))/im,
  );
  return parts.map((p) => p.trim()).filter((p) => p.length > 20);
}

function parseBlock(block: string): FacultyExamQuestion | null {
  const lines = block
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 3) return null;

  const first = lines[0].replace(
    /^(?:(?:Q(?:uestion)?\s*)?\d{1,3}[\.\):\-]\s*)/i,
    '',
  );

  const options: Partial<Record<'A' | 'B' | 'C' | 'D', string>> = {};
  const questionLines: string[] = [first];
  let correct: 'A' | 'B' | 'C' | 'D' | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const answerMatch = line.match(ANSWER_LINE);
    if (answerMatch) {
      const letter = answerMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      if (['A', 'B', 'C', 'D'].includes(letter)) correct = letter;
      continue;
    }

    const optMatch = line.match(OPTION_LINE);
    if (optMatch) {
      const letter = (optMatch[1] ?? optMatch[2]).toUpperCase() as 'A' | 'B' | 'C' | 'D';
      if (['A', 'B', 'C', 'D'].includes(letter)) {
        options[letter] = (optMatch[3] ?? '').trim();
      }
      continue;
    }

    if (!Object.keys(options).length) {
      questionLines.push(line);
    }
  }

  const fullAnswerMatch = block.match(ANSWER_LINE);
  if (!correct && fullAnswerMatch) {
    const letter = fullAnswerMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
    if (['A', 'B', 'C', 'D'].includes(letter)) correct = letter;
  }

  const question_text = questionLines.join(' ').trim();
  if (!question_text) return null;

  const option_a = options.A ?? '';
  const option_b = options.B ?? '';
  const option_c = options.C ?? '';
  const option_d = options.D ?? '';

  if (!option_a && !option_b && !option_c && !option_d) return null;

  return {
    question_text,
    option_a: option_a || '—',
    option_b: option_b || '—',
    option_c: option_c || '—',
    option_d: option_d || '—',
    correct_answer: correct ?? 'A',
  };
}

/** Parse MCQ blocks from plain text (e.g. extracted from a PDF question paper). */
export function parseExamTextFromDocument(raw: string): ParseExamResult {
  const warnings: string[] = [];
  const text = normalizeText(raw);
  if (text.length < 40) {
    return { questions: [], warnings: ['Document text is too short to detect questions.'] };
  }

  const blocks = splitQuestionBlocks(text);
  const questions: FacultyExamQuestion[] = [];

  for (const block of blocks) {
    const q = parseBlock(block);
    if (q) questions.push(q);
  }

  if (questions.length === 0) {
    warnings.push(
      'No MCQs detected. Use numbered questions (1. …), options A–D, and an Answer line (e.g. Answer: B).',
    );
  } else {
    const missingAnswers = questions.filter((q) => !q.correct_answer).length;
    if (missingAnswers > 0) {
      warnings.push(`${missingAnswers} question(s) had no answer key — defaulting to option A.`);
    }
  }

  return { questions, warnings };
}
