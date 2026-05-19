import type { SpeakingTask } from '@/lib/placement/types';

/** Fillers and discourse markers that hurt fluency when overused. */
const FILLER_REGEXES = [
  /\b(um+|uh+|er+|hmm+)\b/gi,
  /\b(like|you know|i mean|basically|actually|sort of|kind of)\b/gi,
];

function countMatches(text: string, regex: RegExp): number {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function clamp(n: number, min = 0, max = 100): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function similarity(a: string, b: string): number {
  const at = new Set(tokenise(a));
  const bt = tokenise(b);
  if (!bt.length || !at.size) return 0;
  const overlap = bt.filter((w) => at.has(w)).length;
  return overlap / bt.length;
}

/**
 * Heuristic transcript scorer. Each sub-score is 0..100; the section roll-up
 * later weights them by the task's marks.
 */
export function scoreSpeakingTranscript(
  task: SpeakingTask,
  transcript: string,
  durationSec: number,
): {
  fluency: number;
  clarity: number;
  grammar: number;
  contentMatch: number;
  wordCount: number;
} {
  const cleaned = (transcript ?? '').trim();
  const words = tokenise(cleaned);
  const wordCount = words.length;

  if (wordCount === 0 || durationSec <= 0) {
    return { fluency: 0, clarity: 0, grammar: 0, contentMatch: 0, wordCount };
  }

  const wpm = (wordCount / Math.max(1, durationSec)) * 60;
  // Comfortable English speaking rate: 110–160 wpm. Anything <60 or >220 hurts.
  const wpmScore =
    wpm >= 110 && wpm <= 160
      ? 100
      : wpm >= 80 && wpm < 110
        ? 80
        : wpm > 160 && wpm <= 200
          ? 80
          : wpm >= 60 && wpm < 80
            ? 65
            : wpm > 200 && wpm <= 240
              ? 60
              : 45;

  const fillerCount = FILLER_REGEXES.reduce((acc, r) => acc + countMatches(cleaned, r), 0);
  const fillerRate = fillerCount / Math.max(1, wordCount / 60); // per minute equivalent
  const fillerPenalty = Math.min(50, Math.round(fillerRate * 6));

  const fluency = clamp(wpmScore - fillerPenalty);

  // Clarity proxy: sentences (split by . ! ?), average words per sentence.
  const sentences = cleaned
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const wps = sentences.length ? wordCount / sentences.length : wordCount;
  const clarity =
    wps >= 6 && wps <= 20
      ? 92
      : wps >= 4 && wps < 6
        ? 78
        : wps > 20 && wps <= 28
          ? 75
          : wps > 28
            ? 60
            : 55;

  // Grammar proxy: presence of basic structure markers (subject + verb-ish patterns)
  // plus penalty for ALL-CAPS / repeated word streaks.
  const repeatedStreaks = (cleaned.match(/\b(\w+)\b(\s+\1\b){2,}/gi) ?? []).length;
  const capsRatio =
    cleaned.replace(/[^A-Za-z]/g, '').length === 0
      ? 0
      : (cleaned.match(/[A-Z]/g) ?? []).length / cleaned.replace(/[^A-Za-z]/g, '').length;
  const grammarBase = Math.min(100, 60 + Math.round(Math.log2(wordCount + 1) * 4));
  const grammar = clamp(grammarBase - repeatedStreaks * 8 - (capsRatio > 0.6 ? 25 : 0));

  let contentMatch = 0;
  if (task.referenceText && task.referenceText.trim()) {
    contentMatch = clamp(Math.round(similarity(task.referenceText, cleaned) * 100));
  } else {
    // Free-form prompts: reward content length relative to expected duration.
    const expectedWords = Math.max(40, task.recordSec * 1.8); // ~108 wpm baseline
    contentMatch = clamp(Math.round((wordCount / expectedWords) * 100));
  }

  return {
    fluency,
    clarity,
    grammar,
    contentMatch,
    wordCount,
  };
}
