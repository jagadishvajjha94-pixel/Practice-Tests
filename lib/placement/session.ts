import { PLACEMENT_SECTIONS, PLACEMENT_TOTAL_SEC } from '@/lib/placement/config';
import { buildPlacementQuestions } from '@/lib/placement/question-banks';
import type {
  PlacementCandidate,
  PlacementSectionId,
  PlacementSectionState,
  PlacementSession,
} from '@/lib/placement/types';

export const PLACEMENT_DRAFT_CANDIDATE_KEY = 'placement:candidate';
export const PLACEMENT_DRAFT_SESSION_KEY = 'placement:session';
export const PLACEMENT_LAST_SCORECARD_PREFIX = 'placement:scorecard:';

/** Build the initial session given a candidate. Resets if storage already has one. */
export function buildPlacementSession(candidate: PlacementCandidate): PlacementSession {
  const banks = buildPlacementQuestions(candidate.seed, candidate.departmentId);
  const sectionStates = {} as Record<PlacementSectionId, PlacementSectionState>;

  for (const cfg of PLACEMENT_SECTIONS) {
    if (cfg.kind === 'mcq') {
      const questions = banks[cfg.id as Exclude<PlacementSectionId, 'speaking'>] ?? [];
      sectionStates[cfg.id] = {
        kind: 'mcq',
        questions,
        answers: {},
        completed: false,
      };
    } else {
      sectionStates[cfg.id] = {
        kind: 'speaking',
        responses: [],
        completed: false,
      };
    }
  }

  return {
    version: 1,
    candidate,
    sectionStates,
    currentSectionIndex: 0,
    sectionTimeLeftSec: PLACEMENT_SECTIONS[0].durationSec,
    globalTimeLeftSec: PLACEMENT_TOTAL_SEC,
    submitted: false,
  };
}

export function saveCandidateDraft(candidate: PlacementCandidate): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PLACEMENT_DRAFT_CANDIDATE_KEY, JSON.stringify(candidate));
  } catch {
    // ignore
  }
}

export function loadCandidateDraft(): PlacementCandidate | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PLACEMENT_DRAFT_CANDIDATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlacementCandidate;
  } catch {
    return null;
  }
}

export function saveSession(session: PlacementSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PLACEMENT_DRAFT_SESSION_KEY, JSON.stringify(session));
    // Mirror to localStorage so a refresh / disconnect can resume on the same device.
    window.localStorage.setItem(
      `${PLACEMENT_DRAFT_SESSION_KEY}:${session.candidate.hallTicket}`,
      JSON.stringify(session),
    );
  } catch {
    // quota / private browsing — best effort
  }
}

export function loadSession(): PlacementSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PLACEMENT_DRAFT_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlacementSession;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadSessionByHallTicket(hallTicket: string): PlacementSession | null {
  if (typeof window === 'undefined' || !hallTicket) return null;
  try {
    const raw = window.localStorage.getItem(`${PLACEMENT_DRAFT_SESSION_KEY}:${hallTicket}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlacementSession;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPlacementDrafts(hallTicket?: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PLACEMENT_DRAFT_SESSION_KEY);
    window.sessionStorage.removeItem(PLACEMENT_DRAFT_CANDIDATE_KEY);
    if (hallTicket) {
      window.localStorage.removeItem(`${PLACEMENT_DRAFT_SESSION_KEY}:${hallTicket}`);
    }
  } catch {
    // ignore
  }
}

export function saveScorecardForAttempt(attemptId: string, scorecardJson: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${PLACEMENT_LAST_SCORECARD_PREFIX}${attemptId}`,
      JSON.stringify(scorecardJson),
    );
  } catch {
    // ignore
  }
}

export function loadScorecardForAttempt<T>(attemptId: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${PLACEMENT_LAST_SCORECARD_PREFIX}${attemptId}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
