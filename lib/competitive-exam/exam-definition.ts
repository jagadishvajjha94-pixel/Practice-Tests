import type { Test } from '@/lib/types';

/** Matches fallback handling in practice submit (`test.id.startsWith('fallback-')`). */
export const COMPETITIVE_ALL_INDIA_TEST_ID = 'fallback-competitive-all-india-v1';

export function getCompetitiveAllIndiaTestMeta(): Test {
  const ts = new Date().toISOString();
  return {
    id: COMPETITIVE_ALL_INDIA_TEST_ID,
    name: 'All India Competitive Selection Paper',
    category_id: 'competitive-exam',
    duration: 90,
    total_questions: 60,
    passing_score: null,
    description:
      '60 MCQs across Maths, Science, Chemistry, Aptitude, Reasoning, Logical Thinking, English Grammar, and Computer Systems. Each sitting draws a fresh stratified set — no repeats within your paper.',
    difficulty_level: 'medium',
    is_paid: false,
    created_at: ts,
    updated_at: ts,
    question_time_limit_sec: null,
  };
}

export const COMPETITIVE_SESSION_SEED_KEY = 'prepindia:cae-session-seed-v1';
