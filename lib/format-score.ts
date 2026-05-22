/** Round a percentage to at most two decimal places (e.g. 66.666 → 66.67). */
export function roundScorePercent(value: number | null | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Display percentage with exactly two decimal places (e.g. 66.67). */
export function formatScorePercent(value: number | null | undefined): string {
  return roundScorePercent(value).toFixed(2);
}

/** Display percentage with suffix, e.g. `66.67%`. */
export function formatScorePercentLabel(value: number | null | undefined): string {
  return `${formatScorePercent(value)}%`;
}

export function averageScorePercent(scores: number[]): number {
  if (!scores.length) return 0;
  const sum = scores.reduce((acc, s) => acc + (Number(s) || 0), 0);
  return roundScorePercent(sum / scores.length);
}

/** Pass rate / attendance-style percentages — same two-decimal cap. */
export function roundRatePercent(value: number | null | undefined): number {
  return roundScorePercent(value);
}

export function formatRatePercentLabel(value: number | null | undefined): string {
  return formatScorePercentLabel(value);
}
