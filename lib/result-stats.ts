import type { Question } from '@/lib/types';
import { answersMatchMcq } from '@/lib/practice-mappers';
import { formatScorePercent, roundScorePercent } from '@/lib/format-score';

export function formatTimeTaken(seconds: number | null | undefined): string {
  const sec = Number(seconds);
  if (!Number.isFinite(sec) || sec <= 0) return '0m';
  const mins = Math.floor(sec / 60);
  const rem = Math.round(sec % 60);
  if (mins === 0) return `${rem}s`;
  if (rem === 0) return `${mins}m`;
  return `${mins}m ${rem}s`;
}

export type ResultStats = {
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  answeredCount: number;
  percentage: number;
  displayPercentage: string;
};

export function computeResultStats(input: {
  questions: Question[];
  answers: Record<string, unknown>;
  storedScore?: number | null;
  storedPct?: number | null;
  totalScoreRaw?: number | null;
  totalQuestionsHint?: number;
  summaryOnly?: boolean;
}): ResultStats {
  const { questions, answers } = input;
  const totalHint = input.totalQuestionsHint ?? questions.length;

  let answeredCount = 0;
  let correctCount = 0;

  for (const question of questions) {
    const entry = answers[question.id];
    const userAnswer =
      entry != null && typeof entry === 'object'
        ? (entry as { userAnswer?: unknown }).userAnswer
        : undefined;
    const attempted =
      userAnswer !== null && userAnswer !== undefined && userAnswer !== '';
    if (attempted) {
      answeredCount += 1;
      if (answersMatchMcq(userAnswer, question.correct_answer)) {
        correctCount += 1;
      }
    }
  }

  const hasPerQuestion = answeredCount > 0;

  if (hasPerQuestion && questions.length > 0) {
    const percentage = roundScorePercent((correctCount / questions.length) * 100);
    return {
      correctCount,
      incorrectCount: questions.length - correctCount,
      unansweredCount: questions.length - answeredCount,
      answeredCount,
      percentage,
      displayPercentage: formatScorePercent(percentage),
    };
  }

  const pct = resolveStoredPercent(
    input.storedPct,
    input.storedScore,
    input.totalScoreRaw,
    totalHint,
  );

  const qTotal = Math.max(totalHint, questions.length, 1);
  const derivedCorrect =
    totalHint > 0 ? Math.min(qTotal, Math.max(0, Math.round((pct / 100) * qTotal))) : 0;
  const derivedAnswered = input.summaryOnly && pct > 0 ? qTotal : answeredCount;

  return {
    correctCount: derivedCorrect,
    incorrectCount: Math.max(0, qTotal - derivedCorrect),
    unansweredCount: Math.max(0, qTotal - derivedAnswered),
    answeredCount: derivedAnswered,
    percentage: pct,
    displayPercentage: formatScorePercent(pct),
  };
}

/** Prefer explicit percentage; ignore raw net score mistakenly stored in `score`. */
export function resolveStoredPercent(
  percentageScore?: number | null,
  score?: number | null,
  totalScoreRaw?: number | null,
  totalQuestions?: number,
): number {
  const pct = toNum(percentageScore);
  if (pct != null && pct >= 0 && pct <= 100) return roundScorePercent(pct);

  const s = toNum(score);
  const total = toNum(totalScoreRaw);
  const q = totalQuestions ?? 0;

  if (s != null && s >= 0 && s <= 100) return roundScorePercent(s);

  if (s != null && q > 0 && s <= q && total == null) {
    return roundScorePercent((s / q) * 100);
  }

  if (total != null && q > 0) {
    return roundScorePercent((total / q) * 100);
  }

  if (s != null) return roundScorePercent(s);
  return 0;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
