/**
 * ~128k deterministic pattern / figure-style MCQs.
 * Each global index maps to one unique item; sessions sample 200 indices without replacement.
 */

import type { Question } from '@/lib/types';

/** 16 × 8 000 = 128 000 variants */
export const PSYCHOMETRIC_KIND_COUNT = 16;
export const PARAMS_PER_KIND = 8000;
export const PSYCHOMETRIC_POOL_SIZE = PSYCHOMETRIC_KIND_COUNT * PARAMS_PER_KIND;

const SHAPES = ['●', '○', '■', '□', '▲', '▼', '◆', '◇'] as const;
const ARROWS = ['↑', '→', '↓', '←'] as const;

function mcq(
  id: string,
  text: string,
  a: string,
  b: string,
  c: string,
  d: string,
  correct: 'A' | 'B' | 'C' | 'D'
): Question {
  const t = new Date().toISOString();
  return {
    id,
    category_id: '',
    difficulty: 'easy',
    question_text: text,
    type: 'MCQ',
    options: null,
    correct_answer: correct,
    explanation: null,
    tags: ['visual', 'psychometric-pool'],
    created_at: t,
    updated_at: t,
    question_type: 'mcq',
    option_a: a,
    option_b: b,
    option_c: c,
    option_d: d,
  };
}

function pick<T>(arr: readonly T[], i: number): T {
  return arr[((i % arr.length) + arr.length) % arr.length]!;
}

/** Seeded PRNG in (0, 1) */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStringToSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Unique indices in [0, poolMax); works for poolMax >> count */
export function sampleUniqueIndices(seed: number, count: number, poolMax: number): number[] {
  const picks = new Set<number>();
  const rng = mulberry32(seed ^ 0xe3779b97);
  let guard = 0;
  while (picks.size < count && picks.size < poolMax && guard < count * 300) {
    guard++;
    picks.add(Math.floor(rng() * poolMax));
  }
  if (picks.size < count) {
    const extra = mulberry32(seed ^ 0x9e3779b1);
    for (let i = 0; i < poolMax && picks.size < count; i++) {
      if (extra() > 0.2) picks.add((i * 7919 + seed) % poolMax);
    }
  }
  let i = 0;
  while (picks.size < count && i < poolMax) {
    picks.add(i);
    i++;
  }
  return Array.from(picks);
}

export function psychometricQuestionFromIndex(rawIdx: number): Question {
  const idx =
    ((rawIdx % PSYCHOMETRIC_POOL_SIZE) + PSYCHOMETRIC_POOL_SIZE) % PSYCHOMETRIC_POOL_SIZE;
  const kind = idx % PSYCHOMETRIC_KIND_COUNT;
  const p = Math.floor(idx / PSYCHOMETRIC_KIND_COUNT);
  const id = `qb-${idx}`;

  switch (kind) {
    case 0: {
      const a0 = 4 + (p % 40);
      const d = 2 + (p % 18);
      const t4 = a0 + 4 * d;
      const stem = `Number pattern — next?\n\n${a0}  ${a0 + d}  ${a0 + 2 * d}  ${a0 + 3 * d}  ?`;
      return mcq(id, stem, String(t4), String(t4 + d + 1), String(t4 - d - 3), String(a0 + d), 'A');
    }
    case 1: {
      const a = 2 + (p % 9);
      const r = 2 + (p % 4);
      const v = [a, a * r, a * r * r, a * r * r * r];
      const ans = v[3]! * r;
      const stem = `Multiply steps — next?\n\n${v.join('  ')}  ?`;
      return mcq(id, stem, String(ans), String(ans + r), String(ans - r - 1), String(a + r), 'A');
    }
    case 2: {
      const s = pick(SHAPES, p);
      const t = pick(SHAPES, p + 3);
      const stem = `Two shapes alternate — next?\n\n${s}  ${t}  ${s}  ${t}  ${s}  ?`;
      return mcq(id, stem, `${t}`, `${s}`, `${pick(SHAPES, p + 9)}`, `${pick(SHAPES, p + 99)}`, 'A');
    }
    case 3: {
      const a = pick(SHAPES, p);
      const b = pick(SHAPES, p + 7);
      const c = pick(SHAPES, p + 14);
      const stem = `Three-shape loop — next?\n\n${a}  ${b}  ${c}  ${a}  ${b}  ?`;
      return mcq(id, stem, `${c}`, `${a}`, `${b}`, `${pick(SHAPES, p + 21)}`, 'A');
    }
    case 4: {
      const main = pick(SHAPES, p);
      const odd = pick(SHAPES, p + 5);
      const stem = `Odd one out — which position?\n\n${main}   ${main}   ${main}   ${odd}`;
      return mcq(id, stem, 'First', 'Second', 'Third', 'Fourth', 'D');
    }
    case 5: {
      const bases = [
        ['●', '○', '●', '○'],
        ['■', '□', '■', '◇'],
        ['▲', '▼', '▲', '◆'],
      ] as const;
      const base = bases[p % 3]!;
      const stem = `How many “solid” wedges (●/■/▲) are shown?\n\n${base.join('  ')}`;
      const fills = base.filter((c) => c === '●' || c === '■' || c === '▲').length;
      return mcq(
        id,
        stem,
        String(fills),
        String((fills + 1) % 5),
        String(fills ? fills - 1 : 3),
        String(fills + 2),
        'A'
      );
    }
    case 6: {
      const i = (p >>> 3) % 4;
      const stem = `Rotate 90° clockwise once:\n\n${pick(ARROWS, i)}`;
      return mcq(
        id,
        stem,
        pick(ARROWS, i + 1),
        pick(ARROWS, i + 2),
        pick(ARROWS, i + 3),
        pick(ARROWS, i),
        'A'
      );
    }
    case 7: {
      const rot = p % 4;
      const seq = [0, 1, 2, 3].map((j) => ARROWS[(j + rot) % 4]);
      const downIx = seq.findIndex((a) => a === '↓');
      const corr = (['A', 'B', 'C', 'D'] as const)[downIx < 0 ? 0 : downIx]!;
      const stem = `Which option is the down arrow ⬇?\n\n${seq.join('     ')}`;
      return mcq(id, stem, seq[0]!, seq[1]!, seq[2]!, seq[3]!, corr);
    }
    case 8:
      return mcq(
        id,
        'Mirror left ↔ right\n\n◢',
        '◣',
        '◤',
        '◥',
        '◢',
        'A'
      );
    case 9: {
      const k = 2 + (p % 5);
      const n0 = 40 + (p % 15);
      const n1 = n0 + k;
      const n2 = n1 + k;
      const n3 = n2 + k;
      const next = n3 + k;
      const stem = `Equal step — next number?\n\n${n0}  ${n1}  ${n2}  ${n3}  ?`;
      return mcq(id, stem, String(next), String(next + k + 4), String(next - k - 9), String(n0), 'A');
    }
    case 10: {
      const rot = p % 8;
      const g1 = pick(SHAPES, rot);
      const g2 = pick(SHAPES, rot + 11);
      const row1 = `${g1}${g2}`;
      const row2 = `${g2}${g1}`;
      const stem = `2×2 checker — bottom-right cell completes the swap pattern:\n\n${row1}\n${row2}`;
      return mcq(id, stem, `${g1}`, `${g2}`, `${pick(SHAPES, rot + 50)}`, `${pick(SHAPES, rot + 60)}`, 'A');
    }
    case 11: {
      const target = pick(SHAPES, (p >>> 6) % 8);
      const other = pick(SHAPES, p);
      const stem = `Row alignment — third column matches row 1?\n\n${target} ${target} ${target}\n${other} ${other} ?`;
      return mcq(id, stem, `${target}`, `${other}`, `${pick(SHAPES, p + 4)}`, `${pick(SHAPES, p + 20)}`, 'A');
    }
    case 12: {
      const m = 9 + ((p >>> 10) % 7);
      const n = 10 + ((p >>> 14) % 20);
      const sum = m + n;
      const stem = `Fast add (like a score bar)\n\n${m}  +  ${n}`;
      return mcq(id, stem, String(sum), String(sum + 3), String(sum - 4), String(m * n), 'A');
    }
    case 13: {
      const a = 31 + ((p >>> 12) % 50);
      const stem = `Remainder only — ${a} mod 7 = ?`;
      const r = ((a % 7) + 7) % 7;
      return mcq(
        id,
        stem,
        String(r),
        String((r + 2) % 7),
        String((r + 5) % 7),
        String((r + 3) % 7),
        'A'
      );
    }
    case 14: {
      const ia = p % SHAPES.length;
      const ib = (ia + 3 + (p % 4)) % SHAPES.length;
      const ic = (ib + 2) % SHAPES.length;
      const s1 = SHAPES[ia]!;
      const s2 = SHAPES[ib]!;
      const s3 = SHAPES[ic]!;
      const stem = `Which symbol appears exactly once?\n\n${s1}  ${s2}  ${s2}  ${s2}`;
      return mcq(id, stem, s1, s2, s3, `${s3}`, 'A');
    }
    case 15:
    default: {
      const n = 6 + ((p >>> 17) % 9);
      const row = `${'●'.repeat(n)}`;
      const stem = `Glyph count:\n\n${row}`;
      return mcq(id, stem, String(n), String(n + 2), String(n - 1), String(Math.max(1, n - 2)), 'A');
    }
  }
}
