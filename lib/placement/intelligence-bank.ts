import type { Question } from '@/lib/types';
import { makeMcq } from '@/lib/competitive-exam/question-factory';

/** ASCII-friendly IQ items (no symbol-only stems) for reliable display in ElevateX. */
type Item = {
  q: string;
  options: [string, string, string, string];
  correct: 'A' | 'B' | 'C' | 'D';
};

const ITEMS: Item[] = [
  {
    q: 'Number series: 3, 7, 15, 31, ?',
    options: ['63', '62', '64', '60'],
    correct: 'A',
  },
  {
    q: 'Number series: 1, 4, 9, 16, ?',
    options: ['25', '20', '24', '36'],
    correct: 'A',
  },
  {
    q: 'If 5 machines make 5 parts in 5 minutes, how long for 100 machines to make 100 parts?',
    options: ['5 minutes', '100 minutes', '20 minutes', '1 minute'],
    correct: 'A',
  },
  {
    q: 'Which does not belong: Circle, Sphere, Cube, Cylinder',
    options: ['Circle', 'Sphere', 'Cube', 'Cylinder'],
    correct: 'A',
  },
  {
    q: 'Mirror of 6:00 time — hour hand points to 6. In mirror, it appears closest to:',
    options: ['6', '12', '3', '9'],
    correct: 'A',
  },
  {
    q: 'Memory: 8, 3, 9, 1 — third number was:',
    options: ['9', '8', '3', '1'],
    correct: 'A',
  },
  {
    q: 'Analogy: FINGER is to HAND as LEAF is to ?',
    options: ['TREE', 'ROOT', 'SOIL', 'BRANCH'],
    correct: 'A',
  },
  {
    q: 'Grid count: 4 rows and 3 columns of dots. Total dots?',
    options: ['12', '7', '10', '9'],
    correct: 'A',
  },
  {
    q: 'Odd letter pair: AB, CD, EF, GH, IJ, ?',
    options: ['KL', 'LM', 'MN', 'NO'],
    correct: 'A',
  },
  {
    q: 'Sequence: Z, Y, X, W, ?',
    options: ['V', 'U', 'T', 'S'],
    correct: 'A',
  },
  {
    q: 'If all Bloops are Razzies and all Razzies are Lazzies, all Bloops are definitely:',
    options: ['Lazzies', 'Razzies only', 'Not Lazzies', 'Unknown'],
    correct: 'A',
  },
  {
    q: 'Weight puzzle: A > B, C > A, lightest is:',
    options: ['B', 'A', 'C', 'Cannot tell'],
    correct: 'A',
  },
  {
    q: '2, 3, 5, 8, 13, ? (Fibonacci-style)',
    options: ['21', '20', '18', '19'],
    correct: 'A',
  },
  {
    q: 'Rotate letter D 90 degrees clockwise. It looks like:',
    options: ['Still D-like / vertical bar emphasis', 'C', 'P', 'B'],
    correct: 'A',
  },
  {
    q: 'Count vowels in the word ENGINEERING:',
    options: ['5', '4', '6', '3'],
    correct: 'A',
  },
  {
    q: 'Which fraction is largest: 2/5, 3/7, 4/9, 5/11?',
    options: ['2/5', '3/7', '4/9', '5/11'],
    correct: 'A',
  },
  {
    q: 'Pattern: 1, 2, 4, 8, 16, ?',
    options: ['32', '24', '30', '20'],
    correct: 'A',
  },
  {
    q: 'If CODE is 27 (sum of letter positions C+O+D+E), then BAD is:',
    options: ['6', '7', '8', '9'],
    correct: 'A',
  },
];

export function placementIntelligenceBank(): Question[] {
  return ITEMS.map((it, idx) =>
    makeMcq({
      id: `placement-iq-bank-${idx + 1}`,
      topicSlug: 'placement-intelligence',
      difficulty: 'medium',
      question_text: it.q,
      options: it.options,
      correctLetter: it.correct,
    }),
  );
}
