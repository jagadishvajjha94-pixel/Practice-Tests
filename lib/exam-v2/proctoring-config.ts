/** Max integrity incidents before the exam auto-submits. */
export const PROCTOR_MAX_VIOLATIONS = 7;

/** Face must be visible within this window or an incident is recorded. */
export const PROCTOR_FACE_ABSENT_SEC = 5;

/** Camera scan interval — ~2.5 FPS keeps CPU low at scale (1000+ concurrent clients). */
export const PROCTOR_FACE_CHECK_MS = 400;

/** Debounce duplicate tab/focus signals (blur + visibilitychange fire together). */
export const PROCTOR_FOCUS_DEBOUNCE_MS = 2500;

/** Minimum gap between repeated suspicious-face incidents. */
export const PROCTOR_SUSPICIOUS_DEBOUNCE_MS = 12000;

/** Batch violation ingest to reduce HTTP chatter (still low volume per student). */
export const PROCTOR_INGEST_FLUSH_MS = 2000;

export type ProctorSubmitReason = 'manual' | 'timeout' | 'proctor_violations';

export type ProctorSummary = {
  sessionId: string;
  violationCount: number;
  autoSubmitted: boolean;
  submitReason: ProctorSubmitReason;
  violations: Array<{ type: string; at: string }>;
};
