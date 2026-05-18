export type ProgrammingProblem = {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium';
  statement: string;
  inputFormat: string;
  outputFormat: string;
  sampleInput: string;
  sampleOutput: string;
  hint?: string;
};

export const PROGRAMMING_SAMPLE_PROBLEMS: ProgrammingProblem[] = [
  {
    id: 'double-number',
    title: 'Double the number',
    difficulty: 'Easy',
    statement: 'Read an integer N and print 2 × N.',
    inputFormat: 'One integer N.',
    outputFormat: 'Print a single integer.',
    sampleInput: '21',
    sampleOutput: '42',
    hint: 'Use stdin/stdout for your language.',
  },
  {
    id: 'sum-two',
    title: 'Sum of two numbers',
    difficulty: 'Easy',
    statement: 'Read two integers A and B. Print their sum.',
    inputFormat: 'Two integers on one line separated by space.',
    outputFormat: 'Print one integer — the sum.',
    sampleInput: '4 7',
    sampleOutput: '11',
  },
  {
    id: 'even-odd',
    title: 'Even or Odd',
    difficulty: 'Easy',
    statement: 'Read N. Print EVEN if N is even, else print ODD.',
    inputFormat: 'One integer N.',
    outputFormat: 'Print EVEN or ODD.',
    sampleInput: '8',
    sampleOutput: 'EVEN',
  },
];
