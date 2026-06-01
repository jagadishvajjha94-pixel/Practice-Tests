/** Turn API `error` fields (string or AWS RDS-style object) into a user-visible message. */
export function formatApiErrorField(error: unknown): string | null {
  if (error == null) return null;
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (!trimmed || trimmed === '{}') return null;
    return trimmed;
  }
  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message.trim();
    }
    if (typeof record.error_description === 'string' && record.error_description.trim()) {
      return record.error_description.trim();
    }
  }
  return null;
}

export function joinApiErrorParts(
  body: { error?: unknown; hint?: string | null },
  fallback: string,
): string {
  const parts = [formatApiErrorField(body.error), body.hint?.trim()].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(' — ') : fallback;
}
