import { prisma } from '@/lib/prisma';
import { normalizeStudentRoll, STUDENT_SESSION_STALE_MS } from '@/lib/student-session-lock';

export type ClaimStudentSessionResult =
  | { ok: true; lockActive: boolean }
  | { ok: false; code: 'already_logged_in'; message: string };

export const STUDENT_ALREADY_LOGGED_IN_MESSAGE =
  'This roll number is already logged in on another device or browser. Log out there first, or wait a few minutes and try again.';

async function purgeStaleSessions(now = Date.now()): Promise<void> {
  const cutoff = new Date(now - STUDENT_SESSION_STALE_MS);
  await prisma.studentActiveSession.deleteMany({
    where: { lastHeartbeat: { lt: cutoff } },
  });
}

export async function claimStudentSessionPrisma(
  rollNumber: string,
  userId: string,
  sessionId: string,
  now = Date.now(),
): Promise<ClaimStudentSessionResult> {
  const roll = normalizeStudentRoll(rollNumber);
  if (!roll || !userId || !sessionId) {
    return { ok: false, code: 'already_logged_in', message: 'Unable to start session.' };
  }

  try {
    await purgeStaleSessions(now);

    const existing = await prisma.studentActiveSession.findUnique({
      where: { userId },
    });

    if (existing && existing.sessionId !== sessionId) {
      return {
        ok: false,
        code: 'already_logged_in',
        message: STUDENT_ALREADY_LOGGED_IN_MESSAGE,
      };
    }

    await prisma.studentActiveSession.upsert({
      where: { userId },
      create: {
        userId,
        sessionId,
        lockedAt: new Date(now),
        lastHeartbeat: new Date(now),
      },
      update: {
        sessionId,
        lastHeartbeat: new Date(now),
      },
    });

    return { ok: true, lockActive: true };
  } catch (err) {
    console.warn('[student-session-lock-prisma] lock failed — allowing login:', err);
    return { ok: true, lockActive: false };
  }
}

export async function touchStudentSessionPrisma(userId: string, sessionId: string): Promise<void> {
  if (!userId || !sessionId) return;
  await prisma.studentActiveSession.updateMany({
    where: { userId, sessionId },
    data: { lastHeartbeat: new Date() },
  });
}

export async function releaseStudentSessionPrisma(
  userId: string,
  sessionId?: string | null,
): Promise<void> {
  if (!userId) return;
  await prisma.studentActiveSession.deleteMany({
    where: sessionId ? { userId, sessionId } : { userId },
  });
}

export function nextAuthSessionId(tokenSub: string, issuedAt?: number): string {
  return `${tokenSub}:${issuedAt ?? Date.now()}`;
}
