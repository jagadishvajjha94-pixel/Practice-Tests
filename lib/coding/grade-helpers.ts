import { CODING_LANGUAGES, getCodingLanguage, type CodingLanguageId } from '@/lib/coding/languages';

/** Normalise whitespace so a stub vs edited source comparison is robust. */
function normalise(src: string | undefined): string {
  return (src ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Choose the language that holds actual user-written code for a problem.
 *
 * Falls back to `currentLanguage` when no language has edits beyond the stub.
 * If multiple languages have edits, the one with the longest non-stub source
 * wins (best heuristic without timestamps).
 */
export function pickBestLanguageForProblem(
  sourcesByLang: Record<CodingLanguageId, string | undefined>,
  currentLanguage: CodingLanguageId,
): CodingLanguageId {
  let best: { lang: CodingLanguageId; length: number } | null = null;

  for (const l of CODING_LANGUAGES) {
    const src = sourcesByLang[l.id];
    if (!src) continue;
    const normalised = normalise(src);
    if (!normalised) continue;
    const stub = normalise(getCodingLanguage(l.id).stub);
    if (normalised === stub) continue;
    if (best === null || normalised.length > best.length) {
      best = { lang: l.id, length: normalised.length };
    }
  }

  if (best) return best.lang;

  // No problem-specific edits found — keep the user's currently selected
  // language so submissions never silently switch on them.
  return currentLanguage;
}
