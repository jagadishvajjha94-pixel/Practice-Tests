export type CountdownParts = {
  totalMs: number;
  hours: number;
  minutes: number;
  seconds: number;
  label: string;
  isPast: boolean;
};

/** Human-readable countdown until `targetIso` from `nowMs` (default: Date.now()). */
export function getCountdownParts(targetIso: string, nowMs = Date.now()): CountdownParts {
  const target = new Date(targetIso).getTime();
  const totalMs = Math.max(0, target - nowMs);
  const isPast = target <= nowMs;

  const totalSec = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return {
    totalMs,
    hours,
    minutes,
    seconds,
    label: isPast ? 'Started' : parts.join(' '),
    isPast,
  };
}
