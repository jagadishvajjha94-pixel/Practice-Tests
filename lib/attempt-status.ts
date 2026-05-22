/** Shared attempt status labels and styling for admin reports and dashboards. */

export function normalizeAttemptStatus(status: string | null | undefined): string {
  return String(status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function isInProgressStatus(status: string | null | undefined): boolean {
  const s = normalizeAttemptStatus(status);
  return s === 'in_progress' || s === 'started' || s === 'active';
}

export function isCompletedAttemptStatus(
  status: string | null | undefined,
  completedAt?: string | null,
): boolean {
  const s = normalizeAttemptStatus(status);
  if (s === 'completed' || s === 'submitted') return true;
  if (isInProgressStatus(status) || s === 'abandoned') return false;
  return Boolean(completedAt);
}

export function formatAttemptStatus(status: string | null | undefined): string {
  const s = normalizeAttemptStatus(status);
  if (!s) return 'Unknown';
  if (s === 'in_progress') return 'In progress';
  if (s === 'abandoned') return 'Abandoned';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function attemptStatusBadgeClass(status: string | null | undefined): string {
  const s = normalizeAttemptStatus(status);
  if (s === 'in_progress' || s === 'started' || s === 'active') {
    return 'bg-amber-100 text-amber-800 border-amber-200';
  }
  if (s === 'completed' || s === 'submitted') {
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
  if (s === 'abandoned') {
    return 'bg-slate-100 text-slate-600 border-slate-200';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200';
}
