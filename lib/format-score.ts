/** Display percentage scores with at most two decimal places (e.g. 66.67). */
export function formatScorePercent(value: number | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.00';
  return (Math.round(n * 100) / 100).toFixed(2);
}

export function averageScorePercent(scores: number[]): number {
  if (!scores.length) return 0;
  const sum = scores.reduce((acc, s) => acc + (Number(s) || 0), 0);
  return sum / scores.length;
}
