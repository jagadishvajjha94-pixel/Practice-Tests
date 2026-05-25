const IST_TIME_ZONE = 'Asia/Kolkata';

/** Calendar date in IST as YYYY-MM-DD (en-CA locale). */
export function getDateKeyInTimeZone(date: Date, timeZone = IST_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getTodayDateKeyInIST(now = new Date()): string {
  return getDateKeyInTimeZone(now, IST_TIME_ZONE);
}

/** UTC ISO bounds for a calendar day in IST (for DB range queries). */
export function getIstDayBoundsIso(dateKey: string): { start: string; end: string } {
  const start = new Date(`${dateKey}T00:00:00+05:30`);
  const end = new Date(`${dateKey}T23:59:59.999+05:30`);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function formatDateKeyLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d, 12, 0, 0)));
}

/** True if an ISO timestamp falls on the given calendar day in IST. */
export function isInstantOnDateKey(
  iso: string | null | undefined,
  dateKey: string,
  timeZone = IST_TIME_ZONE,
): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return getDateKeyInTimeZone(d, timeZone) === dateKey;
}

export function parseReportDateFilter(
  value: string | null | undefined,
): { dateKey: string; label: string } | null {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return null;
  const dateKey = raw === 'today' ? getTodayDateKeyInIST() : raw;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  return { dateKey, label: formatDateKeyLabel(dateKey) };
}

/** Prefer completion time; fall back to start time for in-progress attempts. */
export function attemptActivityDateKey(attempt: {
  completed_at: string | null;
  created_at: string;
}): string | null {
  const iso = attempt.completed_at ?? attempt.created_at;
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return getDateKeyInTimeZone(d, IST_TIME_ZONE);
}
