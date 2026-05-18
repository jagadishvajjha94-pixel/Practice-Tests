import { getCodingLanguage, type CodingLanguageId } from '@/lib/coding/languages';

/** Monaco remounts can briefly write ""; never send empty source to the runner. */
export function effectiveSourceCode(
  stored: string | undefined,
  languageId: CodingLanguageId,
): string {
  const trimmed = stored?.trim() ?? '';
  if (trimmed.length > 0) return stored!;
  return getCodingLanguage(languageId).stub;
}
