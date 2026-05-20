import type { SupabaseClient } from '@supabase/supabase-js';

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function looksLikeUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/** Legacy Supabase rows may return numeric ids as number or numeric string. */
export function looksLikeBigIntId(value: unknown): boolean {
  if (typeof value === 'number' && Number.isFinite(value)) return true;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return true;
  return false;
}

export function normalizeQuestionId(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

export async function detectQuestionsIdKind(admin: SupabaseClient): Promise<'uuid' | 'bigint'> {
  const { data } = await admin.from('questions').select('id').limit(1);
  const raw = (data?.[0] as { id?: unknown } | undefined)?.id;
  if (raw == null) return 'uuid';
  return looksLikeBigIntId(raw) ? 'bigint' : 'uuid';
}
