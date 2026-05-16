/**
 * Paths allowed through /api/exam/* → Exam platform api-gateway (/exam → /internal).
 * Keep this tight: the gateway uses x-internal-token server-side only.
 */
export function isExamProxyPathAllowed(suffix: string): boolean {
  if (suffix === 'sessions/start') return true;
  return /^sessions\/[^/]+\/(autosave|submit)$/.test(suffix);
}
