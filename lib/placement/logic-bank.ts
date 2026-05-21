import type { Question } from '@/lib/types';
import { makeMcq } from '@/lib/competitive-exam/question-factory';

type Item = {
  q: string;
  options: [string, string, string, string];
  correct: 'A' | 'B' | 'C' | 'D';
};

const ITEMS: Item[] = [
  {
    q: 'All cats are mammals. All mammals breathe air. Which conclusion is best supported?',
    options: [
      'All cats breathe air',
      'Some cats do not breathe air',
      'No mammals are cats',
      'All air-breathers are cats',
    ],
    correct: 'A',
  },
  {
    q: 'BOOK : READ :: FOOD : ?',
    options: ['EAT', 'COOK', 'HUNGER', 'TABLE'],
    correct: 'A',
  },
  {
    q: 'If today is Wednesday, what day will it be 10 days from now?',
    options: ['Saturday', 'Sunday', 'Monday', 'Tuesday'],
    correct: 'A',
  },
  {
    q: 'A is taller than B. B is taller than C. Who is shortest?',
    options: ['A', 'B', 'C', 'Cannot be determined'],
    correct: 'C',
  },
  {
    q: 'Find the odd one out: Square, Circle, Triangle, Rectangle',
    options: ['Square', 'Circle', 'Triangle', 'Rectangle'],
    correct: 'B',
  },
  {
    q: 'Statement: Every software bug has a root cause. Conclusion: This crash has a root cause. Valid?',
    options: [
      'Yes, if the crash is a software bug',
      'No, never valid',
      'Only if the crash is hardware',
      'Only on weekends',
    ],
    correct: 'A',
  },
  {
    q: 'Sequence: 2, 6, 12, 20, ?',
    options: ['28', '30', '32', '24'],
    correct: 'B',
  },
  {
    q: 'If NO CODE is written, then TEST cannot pass. Tests passed. What follows?',
    options: [
      'Code was written',
      'Code was not written',
      'Tests are invalid',
      'Nothing can be inferred',
    ],
    correct: 'A',
  },
  {
    q: 'PEN : WRITE :: BRUSH : ?',
    options: ['PAINT', 'DRAW', 'COLOR', 'ART'],
    correct: 'A',
  },
  {
    q: 'Five students sit in a row. A is left of B, and B is left of C. Who is in the middle?',
    options: ['A', 'B', 'C', 'D'],
    correct: 'B',
  },
  {
    q: 'Which number replaces ?: 5, 11, 23, 47, ?',
    options: ['95', '94', '96', '91'],
    correct: 'A',
  },
  {
    q: 'All interns attend training. Ravi is an intern. Therefore:',
    options: [
      'Ravi attends training',
      'Ravi does not attend training',
      'Training is optional',
      'Ravi is not an intern',
    ],
    correct: 'A',
  },
  {
    q: 'Clock shows 3:00. What is the angle between hour and minute hands?',
    options: ['90 degrees', '60 degrees', '120 degrees', '45 degrees'],
    correct: 'A',
  },
  {
    q: 'If A + B = 10 and A - B = 4, then A equals:',
    options: ['7', '6', '8', '5'],
    correct: 'A',
  },
  {
    q: 'Directions: Facing North, turn right twice. You now face:',
    options: ['South', 'East', 'West', 'North'],
    correct: 'A',
  },
  {
    q: 'Pattern: AZ, BY, CX, ?',
    options: ['DW', 'EV', 'FU', 'GT'],
    correct: 'A',
  },
  {
    q: 'In a code, TREE is written as USFF. How is CODE written?',
    options: ['DPEF', 'DPFE', 'COED', 'DODE'],
    correct: 'A',
  },
  {
    q: 'Some doctors are researchers. All researchers publish papers. Which must be true?',
    options: [
      'Some doctors publish papers',
      'All doctors publish papers',
      'No doctors publish papers',
      'All publishers are doctors',
    ],
    correct: 'A',
  },
];

export function placementLogicBank(): Question[] {
  return ITEMS.map((it, idx) =>
    makeMcq({
      id: `placement-logic-bank-${idx + 1}`,
      topicSlug: 'placement-logic',
      difficulty: 'medium',
      question_text: it.q,
      options: it.options,
      correctLetter: it.correct,
    }),
  );
}
