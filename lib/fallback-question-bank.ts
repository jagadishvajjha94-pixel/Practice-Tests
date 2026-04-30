import type { Question, Test, TestCategory } from '@/lib/types';

const now = new Date().toISOString();
const QUESTIONS_PER_ATTEMPT = 15;

const categories: TestCategory[] = [
  { id: '1', name: 'Psychometric Prep', slug: 'psychometric', description: 'Personality and behavioral style questions', icon: '🎭', order: 1, created_at: now },
];

const tests: Test[] = [
  { id: 'fallback-psychometric-1', name: 'Psychometric Practice Set', category_id: '1', duration: 20, total_questions: 5, passing_score: null, description: 'Behavior and preference style questions', difficulty_level: 'easy', is_paid: false, created_at: now, updated_at: now },
];

function mcq(id: string, text: string, a: string, b: string, c: string, d: string, correct: string): Question {
  return {
    id,
    category_id: '',
    difficulty: 'easy',
    question_text: text,
    type: 'MCQ',
    options: null,
    correct_answer: correct,
    explanation: null,
    tags: null,
    created_at: now,
    updated_at: now,
    question_type: 'mcq',
    option_a: a,
    option_b: b,
    option_c: c,
    option_d: d,
  };
}

function randShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildPsychometricPool(): Question[] {
  const prompts = [
    'Best response strategy in psychometric tests is:',
    'Psychometric tests are mainly used to assess:',
    'Consistency in psychometric answers indicates:',
  ];
  return Array.from({ length: 35 }, (_, i) =>
    mcq(
      `q-ps-${i + 1}`,
      prompts[i % prompts.length],
      'Random choice every time',
      'Honest and consistent preference',
      'Always choose extreme options',
      'Skip uncertain items',
      'B'
    )
  );
}

const questionsByTestId: Record<string, Question[]> = {
  'fallback-psychometric-1': buildPsychometricPool(),
};

export function isSchemaMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  return code === 'PGRST205';
}

export function getFallbackCategoryBySlug(slug: string): TestCategory | null {
  return categories.find((c) => c.slug === slug) ?? null;
}

export function getFallbackTestsByCategorySlug(slug: string): Test[] {
  const category = getFallbackCategoryBySlug(slug);
  if (!category) return [];
  return tests.filter((t) => t.category_id === category.id);
}

export function getFallbackTestById(testId: string): Test | null {
  return tests.find((t) => t.id === testId) ?? null;
}

export function getFallbackQuestionsByTestId(testId: string): Question[] {
  const pool = questionsByTestId[testId] ?? [];
  if (pool.length <= QUESTIONS_PER_ATTEMPT) return pool;

  if (typeof window === 'undefined') {
    return randShuffle(pool).slice(0, QUESTIONS_PER_ATTEMPT);
  }

  const seenKey = `fallbackSeen:${testId}`;
  const seenRaw = window.localStorage.getItem(seenKey);
  const seen = new Set<string>(seenRaw ? (JSON.parse(seenRaw) as string[]) : []);

  let unseen = pool.filter((q) => !seen.has(q.id));
  if (unseen.length < QUESTIONS_PER_ATTEMPT) {
    seen.clear();
    unseen = [...pool];
  }

  const selected = randShuffle(unseen).slice(0, QUESTIONS_PER_ATTEMPT);
  for (const q of selected) seen.add(q.id);
  window.localStorage.setItem(seenKey, JSON.stringify(Array.from(seen)));

  return selected;
}
