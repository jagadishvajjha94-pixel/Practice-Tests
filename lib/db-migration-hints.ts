export function isMissingTableOrColumnError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('schema cache') ||
    m.includes('does not exist') ||
    m.includes('could not find the table') ||
    m.includes('column') && m.includes('does not exist')
  );
}

export function isUuidTypeMismatchError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('invalid input syntax for type uuid') || m.includes('type uuid');
}

export function examSchedulesMigrationHint(message: string): string | null {
  if (message.includes('exam_schedules') && isMissingTableOrColumnError(message)) {
    return 'Run supabase/migrations/028_ensure_exam_schedules.sql (or 013 + 024) in Supabase SQL editor, wait 30s, retry.';
  }
  if (isUuidTypeMismatchError(message) && message.includes('test_id')) {
    return 'Run supabase/migrations/024_published_test_id_text.sql and 028_ensure_exam_schedules.sql in Supabase SQL editor.';
  }
  return null;
}

export function rmsetPapersMigrationHint(message: string): string | null {
  if (message.includes('rmset_papers') && isMissingTableOrColumnError(message)) {
    return 'Run supabase/migrations/027_ensure_rmset_papers.sql in Supabase SQL editor, wait 30s, retry.';
  }
  return null;
}
