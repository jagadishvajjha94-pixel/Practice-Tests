import type { DbServiceClient } from '@/lib/db/get-db-service';

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function looksLikeUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/** Legacy rows may return numeric ids as number or numeric string. */
export function looksLikeBigIntId(value: unknown): boolean {
  if (typeof value === 'number' && Number.isFinite(value)) return true;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return true;
  return false;
}

export function normalizeQuestionId(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

export async function detectQuestionsIdKind(admin: DbServiceClient): Promise<'uuid' | 'bigint'> {
  const { data } = await admin.from('questions').select('id').limit(1);
  const raw = (data?.[0] as { id?: unknown } | undefined)?.id;
  if (raw == null) return 'uuid';
  return looksLikeBigIntId(raw) ? 'bigint' : 'uuid';
}

export async function detectTestsIdKind(admin: DbServiceClient): Promise<'uuid' | 'bigint'> {
  const { data } = await admin.from('tests').select('id').limit(1);
  const raw = (data?.[0] as { id?: unknown } | undefined)?.id;
  if (raw == null) {
    return detectQuestionsIdKind(admin);
  }
  return looksLikeBigIntId(raw) ? 'bigint' : 'uuid';
}

export function normalizeTestId(value: unknown, kind: 'uuid' | 'bigint'): string | number {
  const raw = normalizeQuestionId(value);
  if (!raw) return kind === 'bigint' ? 0 : '';
  return kind === 'bigint' ? Number(raw) : raw;
}

export function isUuidTypeMismatchError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('invalid input syntax for type uuid') || m.includes('type uuid');
}
