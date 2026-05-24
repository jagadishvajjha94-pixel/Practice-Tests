import type { Question } from '@/lib/types';
import { generateLogicalQuestions } from '@/lib/competitive-exam/generators';
import { makeMcq } from '@/lib/competitive-exam/question-factory';
import { pickInt } from '@/lib/competitive-exam/seed-rng';
import type { PlacementDepartment } from '@/lib/placement/types';

type TechnicalCategory = PlacementDepartment['technicalCategory'];

function shuffleMcqOptions(
  rng: () => number,
  correct: string,
  wrongs: string[],
): { options: [string, string, string, string]; letter: 'A' | 'B' | 'C' | 'D' } {
  const set = new Set<string>([correct, ...wrongs]);
  const opts = [...set];
  while (opts.length < 4) opts.push(`${correct} (alt ${opts.length})`);
  const base = opts.slice(0, 4);
  for (let i = base.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [base[i], base[j]] = [base[j]!, base[i]!];
  }
  const idx = base.indexOf(correct);
  const letters = ['A', 'B', 'C', 'D'] as const;
  return { options: base as [string, string, string, string], letter: letters[idx >= 0 ? idx : 0] };
}

const PSYCHOMETRIC_TRAITS = [
  'leadership',
  'teamwork',
  'eq',
  'decision',
  'attitude',
  'stress',
] as const;

/** Workplace behaviour MCQs — parametric so each student seed yields unique stems. */
export function generatePsychometricQuestions(
  rng: () => number,
  count: number,
  idPrefix: string,
): Question[] {
  const out: Question[] = [];
  for (let i = 0; i < count; i += 1) {
    const mode = pickInt(rng, 0, 11);
    const trait = PSYCHOMETRIC_TRAITS[pickInt(rng, 0, PSYCHOMETRIC_TRAITS.length - 1)];
    let qText = '';
    let correct = '';
    let wrongs: string[] = [];

    if (mode === 0) {
      const days = pickInt(rng, 1, 4);
      qText = `Your team is ${days} day(s) from a release and a critical defect appears. You should:`;
      correct = 'Open a calm triage, scope impact, and own the fix or delegation';
      wrongs = [
        'Wait silently until someone else notices',
        'Push an untested hotfix without telling anyone',
        'Escalate publicly in a group chat without facts',
      ];
    } else if (mode === 1) {
      qText = 'A teammate takes credit for shared work. The most professional response is to:';
      correct = 'Speak privately, clarify contributions, and document work transparently';
      wrongs = [
        'Confront them loudly in the next meeting',
        'Stop collaborating entirely',
        'Match their behaviour to even the score',
      ];
    } else if (mode === 2) {
      const hrs = pickInt(rng, 9, 23);
      qText = `Production is unstable at ${hrs}:00. You should:`;
      correct = 'Follow the incident runbook, communicate status, and mitigate safely';
      wrongs = [
        'Log off — it is not your shift',
        'Deploy random changes until something works',
        'Blame another team in the status channel',
      ];
    } else if (mode === 3) {
      qText = 'You receive blunt feedback on your deliverable. You should:';
      correct = 'Acknowledge it, ask for specifics, and improve what is valid';
      wrongs = [
        'Defend every line immediately',
        'Ignore the feedback completely',
        'Reply with personal attacks',
      ];
    } else if (mode === 4) {
      const n = pickInt(rng, 2, 5);
      qText = `You have ${n} urgent tasks from different stakeholders. You should:`;
      correct = 'Clarify priorities, negotiate deadlines, and document trade-offs';
      wrongs = [
        'Work on whichever feels easiest',
        'Do all tasks poorly in parallel',
        'Only work on the loudest request',
      ];
    } else if (mode === 5) {
      qText = 'You finish early while teammates are still blocked. You should:';
      correct = 'Offer concrete help or pick up a small unblocking task';
      wrongs = [
        'Take a long break and say nothing',
        'Start an unrelated feature alone',
        'Publicly point out that others are slow',
      ];
    } else if (mode === 6) {
      qText = 'You spot a minor ethical issue in a workflow. You should:';
      correct = 'Raise it with the right stakeholder through proper channels';
      wrongs = [
        'Ignore it because it is small',
        'Change the workflow secretly',
        'Post about it on social media',
      ];
    } else if (mode === 7) {
      qText = 'During a stand-up, your update should focus on:';
      correct = 'Progress, blockers, and what you need next — briefly';
      wrongs = [
        'A full code walkthrough of every file',
        'Other people\'s tasks in detail',
        'Personal weekend plans',
      ];
    } else if (mode === 8) {
      qText = 'You must give difficult feedback to a peer. You should:';
      correct = 'Meet privately, be specific about behaviour and impact';
      wrongs = [
        'Send a harsh group email',
        'Avoid the conversation forever',
        'Tell their manager without speaking to them',
      ];
    } else if (mode === 9) {
      qText = 'After a failed demo, the best team response is to:';
      correct = 'Run a short retro, agree on one improvement, and retry with smaller scope';
      wrongs = [
        'Blame QA publicly',
        'Cancel all agile ceremonies',
        'Ship broken work without telling stakeholders',
      ];
    } else if (mode === 10) {
      qText = 'A junior teammate is afraid to ask questions. You should:';
      correct = 'Make it safe to ask and offer short regular check-ins';
      wrongs = [
        'Wait until they fail',
        'Take over all their work',
        'Report them for being slow',
      ];
    } else {
      qText = 'You made a mistake that affected production. You should:';
      correct = 'Own it immediately, mitigate, then write a calm post-mortem';
      wrongs = [
        'Hide it until someone else finds out',
        'Blame the tooling',
        'Take unplanned leave without handover',
      ];
    }

    const { options, letter } = shuffleMcqOptions(rng, correct, wrongs);
    out.push(
      makeMcq({
        id: `${idPrefix}-psy-${i}`,
        topicSlug: `placement-psychometric-${trait}`,
        difficulty: 'medium',
        question_text: qText,
        options,
        correctLetter: letter,
        explanation: null,
      }),
    );
  }
  return out;
}

/** IQ / intelligence items — numeric series, analogies, odd-one-out (unique per seed). */
export function generateIntelligenceQuestions(
  rng: () => number,
  count: number,
  idPrefix: string,
): Question[] {
  const out: Question[] = [];
  const analogies: Array<[string, string, string, string]> = [
    ['FINGER', 'HAND', 'LEAF', 'TREE'],
    ['WHEEL', 'CAR', 'PAGE', 'BOOK'],
    ['KEY', 'LOCK', 'PASSWORD', 'ACCOUNT'],
    ['PEN', 'WRITE', 'KNIFE', 'CUT'],
    ['TEACHER', 'SCHOOL', 'DOCTOR', 'HOSPITAL'],
  ];

  for (let i = 0; i < count; i += 1) {
    const mode = pickInt(rng, 0, 7);
    let qText = '';
    let correct = '';
    let wrongs: string[] = [];

    if (mode === 0) {
      const start = pickInt(rng, 2, 9);
      const step = pickInt(rng, 2, 7);
      const seq = [start, start + step, start + step * 2, start + step * 3];
      const next = start + step * 4;
      qText = `Number series: ${seq.join(', ')}, ?`;
      correct = String(next);
      wrongs = [String(next + step), String(next - step), String(start + step)];
    } else if (mode === 1) {
      const n = pickInt(rng, 2, 12);
      const sq = n * n;
      qText = `Number series: ${(n - 1) ** 2}, ${sq}, ${(n + 1) ** 2}, ?`;
      correct = String((n + 2) ** 2);
      wrongs = [String(sq + n), String(sq + 2), String((n + 3) ** 2)];
    } else if (mode === 2) {
      const a = pickInt(rng, 3, 9);
      const b = pickInt(rng, 2, 6);
      qText = `If ${a} workers finish a job in ${b} days, how many days for ${a * 2} workers (same rate)?`;
      correct = String(Math.max(1, Math.round(b / 2)));
      wrongs = [String(b * 2), String(b + a), String(a + b)];
    } else if (mode === 3) {
      const [a, b, c, ans] = analogies[pickInt(rng, 0, analogies.length - 1)]!;
      qText = `${a} : ${b} :: ${c} : ?`;
      correct = ans;
      wrongs = [b, a, `${ans}S`];
    } else if (mode === 4) {
      const rows = pickInt(rng, 3, 8);
      const cols = pickInt(rng, 3, 8);
      qText = `A grid has ${rows} rows and ${cols} columns of dots. Total dots?`;
      correct = String(rows * cols);
      wrongs = [String(rows + cols), String(rows * cols + 1), String(rows * cols - 1)];
    } else if (mode === 5) {
      const shapes = ['Circle', 'Square', 'Triangle', 'Sphere', 'Cube'];
      const odd = shapes[pickInt(rng, 0, shapes.length - 1)]!;
      const list = [...shapes].sort(() => rng() - 0.5).slice(0, 4);
      if (!list.includes(odd)) list[0] = odd;
      qText = `Which does NOT belong: ${list.join(', ')}`;
      correct = odd;
      wrongs = list.filter((s) => s !== odd).slice(0, 3);
    } else if (mode === 6) {
      const nums = Array.from({ length: 4 }, () => pickInt(rng, 1, 99));
      qText = `Memory: ${nums.join(', ')} — what was the second number?`;
      correct = String(nums[1]);
      wrongs = [String(nums[0]), String(nums[2]), String(nums[3])];
    } else {
      const x = pickInt(rng, 10, 99);
      const rev = [...String(x)].reverse().join('');
      qText = `If ${x} is reversed digit-wise, the result is:`;
      correct = rev;
      wrongs = [String(x), String(x + 1), String(Number(rev) + 1)];
    }

    const { options, letter } = shuffleMcqOptions(rng, correct, wrongs);
    out.push(
      makeMcq({
        id: `${idPrefix}-iq-${i}`,
        topicSlug: 'placement-intelligence',
        difficulty: 'medium',
        question_text: qText,
        options,
        correctLetter: letter,
        explanation: null,
      }),
    );
  }
  return out;
}

/** Branch-aware technical MCQs — large parametric pool per category. */
export function generateTechnicalQuestions(
  category: TechnicalCategory,
  rng: () => number,
  count: number,
  idPrefix: string,
): Question[] {
  const out: Question[] = [];
  for (let i = 0; i < count; i += 1) {
    const mode = pickInt(rng, 0, 15);
    let qText = '';
    let correct = '';
    let wrongs: string[] = [];
    let topic = 'placement-tech-generated';

    if (mode === 0) {
      const n = pickInt(rng, 100, 9999);
      topic = 'placement-tech-complexity';
      qText = `Binary search on a sorted array of ${n} elements has worst-case comparisons about:`;
      correct = String(Math.ceil(Math.log2(n)));
      wrongs = [String(n), String(Math.floor(n / 2)), '1'];
    } else if (mode === 1) {
      topic = 'placement-tech-ds';
      qText = 'Which structure is most associated with LIFO order?';
      correct = 'Stack';
      wrongs = ['Queue', 'Heap', 'Deque'];
    } else if (mode === 2) {
      const port = [22, 80, 443, 3306, 5432][pickInt(rng, 0, 4)]!;
      topic = 'placement-tech-network';
      qText = `Which service commonly uses port ${port}?`;
      const map: Record<number, string> = {
        22: 'SSH',
        80: 'HTTP',
        443: 'HTTPS',
        3306: 'MySQL',
        5432: 'PostgreSQL',
      };
      correct = map[port] ?? 'HTTP';
      wrongs = ['FTP', 'SMTP', 'DNS'].filter((x) => x !== correct);
    } else if (mode === 3) {
      topic = 'placement-tech-sql';
      qText = 'In SQL, which clause filters rows before aggregation?';
      correct = 'WHERE';
      wrongs = ['HAVING', 'ORDER BY', 'GROUP BY'];
    } else if (mode === 4) {
      topic = 'placement-tech-os';
      qText = 'A page fault typically means:';
      correct = 'A referenced page is not currently in main memory';
      wrongs = ['The CPU overheated', 'The disk is full', 'The process ended normally'];
    } else if (mode === 5 && (category === 'cyber' || category === 'cse')) {
      topic = 'placement-tech-security';
      qText = 'Which practice best reduces credential theft risk?';
      correct = 'Use MFA and never commit secrets to source control';
      wrongs = [
        'Share passwords in chat for speed',
        'Use one password for all tools',
        'Disable HTTPS in dev forever',
      ];
    } else if (mode === 6 && category === 'ece') {
      const f = pickInt(rng, 2, 18);
      topic = 'placement-tech-ece';
      qText = `A signal frequency doubles from ${f} kHz. Its period becomes about half. Half of ${f} kHz period in ms is closest to:`;
      correct = `${Math.round(500 / f)} ms`;
      wrongs = [`${f * 2} ms`, `${f} ms`, 'unchanged'];
    } else if (mode === 7 && category === 'aiml') {
      topic = 'placement-tech-aiml';
      qText = 'Overfitting in ML usually means:';
      correct = 'Low training error but poor generalization on new data';
      wrongs = [
        'High error on both train and test',
        'Model is too simple',
        'Dataset has no labels',
      ];
    } else if (mode === 8 && category === 'mechanical') {
      topic = 'placement-tech-mech';
      qText = 'Stress is defined as:';
      correct = 'Force per unit area';
      wrongs = ['Change in length', 'Energy per charge', 'Mass per volume'];
    } else if (mode === 9 && category === 'civil') {
      topic = 'placement-tech-civil';
      qText = 'Concrete grade M25 indicates characteristic strength of:';
      correct = '25 N/mm² (approx)';
      wrongs = ['25 kg/m³', '25 MPa after 1 day only', '25% cement'];
    } else if (mode === 10) {
      const a = pickInt(rng, 8, 64);
      const b = pickInt(rng, 2, 16);
      topic = 'placement-tech-bitwise';
      qText = `What is ${a} AND ${b} in decimal? (bitwise)`;
      correct = String(a & b);
      wrongs = [String(a | b), String(a ^ b), String(a + b)];
    } else if (mode === 11) {
      topic = 'placement-tech-web';
      qText = 'HTTP status 404 means:';
      correct = 'Resource not found';
      wrongs = ['Unauthorized', 'Server error', 'Success'];
    } else if (mode === 12) {
      topic = 'placement-tech-git';
      qText = 'Which Git command stages all modified tracked files?';
      correct = 'git add -A';
      wrongs = ['git push -A', 'git stage-all', 'git commit -A'];
    } else if (mode === 13) {
      const n = pickInt(rng, 4, 64);
      topic = 'placement-tech-complexity';
      qText = `Merge sort on ${n} items has time complexity:`;
      correct = 'O(n log n)';
      wrongs = ['O(n²)', 'O(n)', 'O(log n)'];
    } else {
      topic = 'placement-tech-general';
      qText = 'REST APIs are typically stateless because:';
      correct = 'Each request carries enough context; server does not rely on prior session state';
      wrongs = [
        'They never use databases',
        'They only support GET',
        'They cannot authenticate users',
      ];
    }

    const { options, letter } = shuffleMcqOptions(rng, correct, wrongs);
    out.push(
      makeMcq({
        id: `${idPrefix}-tech-${category}-${i}`,
        topicSlug: topic,
        difficulty: 'medium',
        question_text: qText,
        options,
        correctLetter: letter,
        explanation: null,
      }),
    );
  }
  return out;
}

export function generatePlacementLogicQuestions(
  rng: () => number,
  count: number,
  idPrefix: string,
): Question[] {
  return generateLogicalQuestions(rng, count, idPrefix);
}
