import type { Question } from '@/lib/types';
import { shuffleInPlace } from '@/lib/competitive-exam/seed-rng';

const NOW = () => new Date().toISOString();

/** Shuffle four options so the keyed answer rotates (curated stems often defaulted to “A”). */
export function remixMcqOptions(q: Question, rng: () => number): Question {
  const letters = ['A', 'B', 'C', 'D'] as const;
  const legacy =
    q.option_a != null && q.option_b != null && q.option_c != null && q.option_d != null;
  const texts = legacy
    ? [String(q.option_a), String(q.option_b), String(q.option_c), String(q.option_d)]
    : q.options?.length === 4
      ? [...q.options.map(String)]
      : null;
  if (!texts) return q;

  const oldLetter = String(q.correct_answer ?? 'A').toUpperCase().charAt(0);
  const oldIdx = letters.indexOf(oldLetter as (typeof letters)[number]);
  const correctText = texts[oldIdx >= 0 ? oldIdx : 0];

  const copy = [...texts];
  shuffleInPlace(copy, rng);
  const newIdx = copy.indexOf(correctText);
  const newLetter = letters[newIdx >= 0 ? newIdx : 0];

  return {
    ...q,
    options: [...copy],
    option_a: copy[0],
    option_b: copy[1],
    option_c: copy[2],
    option_d: copy[3],
    correct_answer: newLetter,
    question_type: 'mcq',
  };
}

export function makeMcq(input: {
  id: string;
  topicSlug: string;
  difficulty?: Question['difficulty'];
  question_text: string;
  options: [string, string, string, string];
  correctLetter: 'A' | 'B' | 'C' | 'D';
  explanation?: string | null;
}): Question {
  const ts = NOW();
  const [option_a, option_b, option_c, option_d] = input.options;
  return {
    id: input.id,
    category_id: input.topicSlug,
    difficulty: input.difficulty ?? 'medium',
    question_text: input.question_text,
    type: 'MCQ',
    options: [...input.options],
    correct_answer: input.correctLetter,
    explanation: input.explanation ?? null,
    tags: [input.topicSlug],
    created_at: ts,
    updated_at: ts,
    question_type: 'mcq',
    option_a,
    option_b,
    option_c,
    option_d,
  };
}
