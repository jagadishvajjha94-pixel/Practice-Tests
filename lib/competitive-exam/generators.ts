import type { Question } from '@/lib/types';
import { makeMcq } from '@/lib/competitive-exam/question-factory';
import { pickInt, shuffleInPlace } from '@/lib/competitive-exam/seed-rng';

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

function uniqOpts(correct: string, wrongs: string[]): [string, string, string, string] {
  const set = new Set<string>([correct, ...wrongs]);
  const opts = [...set];
  while (opts.length < 4) opts.push(`${correct} (${opts.length})`);
  return opts.slice(0, 4) as [string, string, string, string];
}

function shuffleMcqOptions(
  rng: () => number,
  correct: string,
  wrongs: string[],
): { options: [string, string, string, string]; letter: 'A' | 'B' | 'C' | 'D' } {
  const base = uniqOpts(correct, wrongs);
  const opts = [...base];
  shuffleInPlace(opts, rng);
  const idx = opts.indexOf(correct);
  const letters = ['A', 'B', 'C', 'D'] as const;
  return { options: opts as [string, string, string, string], letter: letters[idx >= 0 ? idx : 0] };
}

/** Maths & numeric aptitude variants — unique stems per RNG draw. */
export function generateMathsQuestions(rng: () => number, count: number, idPrefix: string): Question[] {
  const out: Question[] = [];
  for (let i = 0; i < count; i++) {
    const mode = pickInt(rng, 0, 7);
    let qText = '';
    let correct = '';
    let opts: [string, string, string, string];
    let letter: 'A' | 'B' | 'C' | 'D';

    if (mode === 0) {
      const a = pickInt(rng, 12, 198);
      const b = pickInt(rng, 5, 97);
      const sum = a + b;
      qText = `What is ${a} + ${b}?`;
      correct = String(sum);
      ({ options: opts, letter } = shuffleMcqOptions(rng, correct, [
        String(sum + pickInt(rng, 2, 9)),
        String(sum - pickInt(rng, 2, 11)),
        String(sum + 10),
      ]));
    } else if (mode === 1) {
      const a = pickInt(rng, 50, 999);
      const b = pickInt(rng, 11, 89);
      const diff = a - b;
      qText = `What is ${a} − ${b}?`;
      correct = String(diff);
      ({ options: opts, letter } = shuffleMcqOptions(rng, correct, [
        String(diff + pickInt(rng, 3, 17)),
        String(diff - pickInt(rng, 2, 9)),
        String(diff + 25),
      ]));
    } else if (mode === 2) {
      const a = pickInt(rng, 7, 49);
      const b = pickInt(rng, 7, 49);
      const p = a * b;
      qText = `What is ${a} × ${b}?`;
      correct = String(p);
      ({ options: opts, letter } = shuffleMcqOptions(rng, correct, [String(p + a), String(p - b), String(a + b)]));
    } else if (mode === 3) {
      const base = pickInt(rng, 60, 980);
      const p = pickInt(rng, 5, 35);
      const ans = Math.round((base * p) / 100);
      qText = `What is ${p}% of ${base}?`;
      correct = String(ans);
      ({ options: opts, letter } = shuffleMcqOptions(rng, correct, [
        String(ans + pickInt(rng, 3, 12)),
        String(Math.max(0, ans - pickInt(rng, 4, 20))),
        String(Math.floor(base / Math.max(1, p))),
      ]));
    } else if (mode === 4) {
      const a = pickInt(rng, 4, 28);
      const b = pickInt(rng, 4, 28);
      const l = lcm(a, b);
      qText = `What is the LCM of ${a} and ${b}?`;
      correct = String(l);
      ({ options: opts, letter } = shuffleMcqOptions(rng, correct, [
        String(a * b),
        String(Math.floor((a * b) / 2)),
        String(Math.abs(a - b)),
      ]));
    } else if (mode === 5) {
      const p = pickInt(rng, 800, 9800);
      const r = pickInt(rng, 4, 14);
      const t = pickInt(rng, 2, 5);
      const si = Math.round((p * r * t) / 100);
      qText = `Simple interest on ₹${p} at ${r}% per annum for ${t} years is:`;
      correct = `₹${si}`;
      ({ options: opts, letter } = shuffleMcqOptions(rng, correct, [
        `₹${si + pickInt(rng, 40, 220)}`,
        `₹${Math.max(0, si - pickInt(rng, 40, 180))}`,
        `₹${Math.round(p / Math.max(1, r + t))}`,
      ]));
    } else if (mode === 6) {
      const mp = pickInt(rng, 150, 980) * 10;
      const disc = pickInt(rng, 30, Math.min(220, mp - 50));
      const sp = mp - disc;
      qText = `Marked price ₹${mp}, discount ₹${disc}. What is the sale price?`;
      correct = `₹${sp}`;
      ({ options: opts, letter } = shuffleMcqOptions(rng, correct, [
        `₹${sp + 50}`,
        `₹${Math.max(0, sp - 120)}`,
        `₹${mp + disc}`,
      ]));
    } else {
      const x = pickInt(rng, 2, 12);
      const ans = x * x * x;
      qText = `What is ${x}³?`;
      correct = String(ans);
      ({ options: opts, letter } = shuffleMcqOptions(rng, correct, [
        String(ans + x),
        String(ans - x),
        String(x * x),
      ]));
    }

    const mcq = makeMcq({
      id: `${idPrefix}-m-${i}`,
      topicSlug: 'competitive-maths',
      difficulty: 'medium',
      question_text: qText,
      options: opts,
      correctLetter: letter,
      explanation: null,
    });
    out.push(mcq);
  }
  return out;
}

/** Aptitude — profit/loss, averages, speed-distance-lite (numeric MCQ). */
export function generateAptitudeQuestions(rng: () => number, count: number, idPrefix: string): Question[] {
  const out: Question[] = [];
  for (let i = 0; i < count; i++) {
    const mode = pickInt(rng, 0, 5);
    let qText = '';
    let correct = '';
    let opts: [string, string, string, string];
    let letter: 'A' | 'B' | 'C' | 'D';

    if (mode === 0) {
      const cp = pickInt(rng, 120, 980);
      const gain = pickInt(rng, 8, 120);
      const pct = Math.round((gain / cp) * 1000) / 10;
      qText = `Cost price ₹${cp}, profit ₹${gain}. Profit % is nearest to:`;
      correct = `${pct}%`;
      ({ options: opts, letter } = shuffleMcqOptions(rng, correct, [
        `${pct + pickInt(rng, 4, 18)}%`,
        `${Math.max(0, pct - pickInt(rng, 5, 25))}%`,
        `${pct + 40}%`,
      ]));
    } else if (mode === 1) {
      const n = pickInt(rng, 5, 14);
      const sum = pickInt(rng, n * 18, n * 52);
      const avg = Math.round(sum / n);
      qText = `Average of ${n} numbers is ${avg}. Their sum is:`;
      correct = String(avg * n);
      ({ options: opts, letter } = shuffleMcqOptions(rng, correct, [
        String(avg * n + pickInt(rng, 10, 90)),
        String(Math.max(0, avg * n - pickInt(rng, 10, 70))),
        String(avg + n),
      ]));
    } else if (mode === 2) {
      const d = pickInt(rng, 120, 780);
      const s = pickInt(rng, 36, 92);
      const t = Math.round((d / s) * 100) / 100;
      qText = `Distance ${d} km at ${s} km/h requires time (hours):`;
      correct = `${t}`;
      ({ options: opts, letter } = shuffleMcqOptions(rng, correct, [
        `${Math.round((t + 0.4) * 100) / 100}`,
        `${Math.max(0.1, Math.round((t - 0.6) * 100) / 100)}`,
        `${d + s}`,
      ]));
    } else if (mode === 3) {
      const tot = pickInt(rng, 28, 96);
      const r = pickInt(rng, 2, tot - 2);
      const b = tot - r;
      qText = `Ratio of red:blue balls is ${r}:${b}. Fraction red is:`;
      const num = r;
      const den = tot;
      const g = gcd(num, den);
      correct = `${num / g}/${den / g}`;
      ({ options: opts, letter } = shuffleMcqOptions(rng, correct, [
        `${num}/${den + 1}`,
        `${num + 1}/${den}`,
        `${b}/${tot}`,
      ]));
    } else if (mode === 4) {
      const a = pickInt(rng, 14, 58);
      const b = pickInt(rng, 16, 62);
      const c = pickInt(rng, 12, 54);
      const avg = Math.round(((a + b + c) / 3) * 10) / 10;
      qText = `Average of ${a}, ${b}, and ${c} is:`;
      correct = `${avg}`;
      ({ options: opts, letter } = shuffleMcqOptions(rng, correct, [
        `${avg + pickInt(rng, 3, 15)}`,
        `${Math.round((avg - 4) * 10) / 10}`,
        `${a + b + c}`,
      ]));
    } else {
      const pop = pickInt(rng, 8000, 52000);
      const inc = pickInt(rng, 5, 28);
      const newPop = Math.round(pop * (1 + inc / 100));
      qText = `Town population ${pop} grows ${inc}% annually (approx simple step). Next count nearest:`;
      correct = `${newPop}`;
      ({ options: opts, letter } = shuffleMcqOptions(rng, correct, [
        `${newPop + pickInt(rng, 400, 2400)}`,
        `${Math.max(1000, newPop - pickInt(rng, 600, 3800))}`,
        `${pop + inc}`,
      ]));
    }

    out.push(
      makeMcq({
        id: `${idPrefix}-ap-${i}`,
        topicSlug: 'competitive-aptitude',
        difficulty: 'medium',
        question_text: qText,
        options: opts,
        correctLetter: letter,
        explanation: null,
      }),
    );
  }
  return out;
}

/** Numeric / verbal reasoning patterns. */
export function generateReasoningQuestions(rng: () => number, count: number, idPrefix: string): Question[] {
  const out: Question[] = [];
  for (let i = 0; i < count; i++) {
    const mode = pickInt(rng, 0, 3);

    if (mode === 0) {
      const start = pickInt(rng, 3, 17);
      const step = pickInt(rng, 2, 9);
      const seq = [start, start + step, start + step * 2, start + step * 3, start + step * 4];
      const next = start + step * 5;
      const qText = `Find the next term: ${seq.join(', ')}, ?`;
      const correct = String(next);
      const { options: opts, letter } = shuffleMcqOptions(rng, correct, [
        String(next + step),
        String(next - step),
        String(start + step),
      ]);
      out.push(
        makeMcq({
          id: `${idPrefix}-re-${i}-n`,
          topicSlug: 'competitive-reasoning',
          difficulty: 'medium',
          question_text: qText,
          options: opts,
          correctLetter: letter,
          explanation: null,
        }),
      );
    } else if (mode === 1) {
      const a = String.fromCharCode(65 + pickInt(rng, 0, 12));
      const b = String.fromCharCode(a.charCodeAt(0) + pickInt(rng, 3, 9));
      const c = String.fromCharCode(b.charCodeAt(0) + (b.charCodeAt(0) - a.charCodeAt(0)));
      const qText = `Letter series: ${a}, ${b}, ${c}, ?`;
      const nextCode = c.charCodeAt(0) + (c.charCodeAt(0) - b.charCodeAt(0));
      const correct = String.fromCharCode(nextCode);
      const { options: opts, letter } = shuffleMcqOptions(rng, correct, [
        String.fromCharCode(nextCode + 1),
        String.fromCharCode(Math.max(65, nextCode - 2)),
        String.fromCharCode(nextCode + 3),
      ]);
      out.push(
        makeMcq({
          id: `${idPrefix}-re-${i}-l`,
          topicSlug: 'competitive-reasoning',
          difficulty: 'medium',
          question_text: qText,
          options: opts,
          correctLetter: letter,
          explanation: null,
        }),
      );
    } else if (mode === 2) {
      const word = ['CAT', 'DOG', 'BAT', 'RAT', 'MAT'][pickInt(rng, 0, 4)];
      const qText = `If letters of '${word}' are reversed, which word appears?`;
      const correct = [...word].reverse().join('');
      const { options: opts, letter } = shuffleMcqOptions(rng, correct, [
        `${word}${word}`,
        [...word].sort().join(''),
        word.slice(1) + word[0],
      ]);
      out.push(
        makeMcq({
          id: `${idPrefix}-re-${i}-w`,
          topicSlug: 'competitive-reasoning',
          difficulty: 'easy',
          question_text: qText,
          options: opts,
          correctLetter: letter,
          explanation: null,
        }),
      );
    } else {
      const dir = ['North', 'East', 'South', 'West'];
      const idx = pickInt(rng, 0, 3);
      const turns = pickInt(rng, 1, 3);
      const next = dir[(idx + turns) % 4];
      const qText = `Facing ${dir[idx]}, you turn right ${turns} time(s). You now face:`;
      const correct = next;
      const { options: opts, letter } = shuffleMcqOptions(rng, correct, [
        dir[(idx + turns + 1) % 4],
        dir[(idx - turns + 4) % 4],
        dir[idx],
      ]);
      out.push(
        makeMcq({
          id: `${idPrefix}-re-${i}-d`,
          topicSlug: 'competitive-reasoning',
          difficulty: 'medium',
          question_text: qText,
          options: opts,
          correctLetter: letter,
          explanation: null,
        }),
      );
    }
  }
  return out;
}

export function generateLogicalQuestions(rng: () => number, count: number, idPrefix: string): Question[] {
  const out: Question[] = [];
  const syllogisms: Array<{ maj: string; min: string; conc: string; wrongs: string[] }> = [
    {
      maj: 'All roses are flowers.',
      min: 'Some flowers fade quickly.',
      conc: 'Some roses may fade quickly.',
      wrongs: ['All roses fade quickly.', 'No roses fade quickly.', 'Some roses are not flowers.'],
    },
    {
      maj: 'No reptiles are mammals.',
      min: 'All snakes are reptiles.',
      conc: 'No snakes are mammals.',
      wrongs: ['Some snakes are mammals.', 'All mammals are snakes.', 'Some reptiles are mammals.'],
    },
    {
      maj: 'All squares are rectangles.',
      min: 'Some rectangles are red.',
      conc: 'Some squares may be red.',
      wrongs: ['All squares are red.', 'No squares are rectangles.', 'All red shapes are squares.'],
    },
  ];

  const analogies = [
    { stem: 'BOOK : READ :: FOOD : ?', ans: 'EAT', wrongs: ['COOK', 'HUNGER', 'TABLE'] },
    { stem: 'DOCTOR : HOSPITAL :: TEACHER : ?', ans: 'SCHOOL', wrongs: ['BOOK', 'STUDENT', 'BLACKBOARD'] },
    { stem: 'ENGINE : CAR :: HEART : ?', ans: 'BODY', wrongs: ['BLOOD', 'VEIN', 'LUNG'] },
  ];

  for (let i = 0; i < count; i++) {
    const mode = pickInt(rng, 0, 2);
    if (mode === 0) {
      const s = syllogisms[pickInt(rng, 0, syllogisms.length - 1)];
      const { options: opts, letter } = shuffleMcqOptions(rng, s.conc, s.wrongs);
      out.push(
        makeMcq({
          id: `${idPrefix}-lo-${i}-sy`,
          topicSlug: 'competitive-logical',
          difficulty: 'medium',
          question_text: `${s.maj} ${s.min} Which conclusion is best supported?`,
          options: opts,
          correctLetter: letter,
          explanation: null,
        }),
      );
    } else if (mode === 1) {
      const a = analogies[pickInt(rng, 0, analogies.length - 1)];
      const { options: opts, letter } = shuffleMcqOptions(rng, a.ans, a.wrongs);
      out.push(
        makeMcq({
          id: `${idPrefix}-lo-${i}-an`,
          topicSlug: 'competitive-logical',
          difficulty: 'medium',
          question_text: a.stem,
          options: opts,
          correctLetter: letter,
          explanation: null,
        }),
      );
    } else {
      const colors = ['Red', 'Blue', 'Green', 'Yellow'];
      const order = [...colors].sort(() => rng() - 0.5).slice(0, 4);
      const qText = `Colours listed (random order): ${order.join(', ')}. Alphabetically by colour name, which comes second?`;
      const sorted = [...order].sort((a, b) => a.localeCompare(b));
      const correct = sorted[1];
      const { options: opts, letter } = shuffleMcqOptions(rng, correct, [sorted[0], sorted[2], sorted[3]]);
      out.push(
        makeMcq({
          id: `${idPrefix}-lo-${i}-cl`,
          topicSlug: 'competitive-logical',
          difficulty: 'medium',
          question_text: qText,
          options: opts,
          correctLetter: letter,
          explanation: null,
        }),
      );
    }
  }
  return out;
}
