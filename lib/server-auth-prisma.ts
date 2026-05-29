import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { AppRole, ResolvedUser } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { resolveAppUserById, roleAllows } from '@/lib/roles-prisma';
import { verifyPassword } from '@/lib/password';

export type PrismaAuthContext = {
  user: { id: string; email?: string };
  resolved: ResolvedUser;
};

import { useAwsStack } from '@/lib/aws/stack';
import { autoEnsureRdsSchema } from '@/lib/db/auto-ensure-rds';

export function usePrismaAuth(): boolean {
  return useAwsStack();
}

async function resolveFromBearerToken(token: string): Promise<PrismaAuthContext | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const { decode } = await import('next-auth/jwt');
  const payload = await decode({
    token,
    secret,
    salt: '',
  });

  const sub = payload?.sub;
  if (!sub || typeof sub !== 'string') return null;

  const resolved = await resolveAppUserById(sub);
  if (!resolved) return null;

  return {
    user: { id: sub, email: resolved.email },
    resolved,
  };
}

export async function requirePrismaAuth(
  allowedRoles?: AppRole[],
  request?: Request,
): Promise<{ ctx: PrismaAuthContext } | { response: NextResponse }> {
  await autoEnsureRdsSchema();

  const bearer = request?.headers.get('Authorization');
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7).trim() : null;

  if (token) {
    const ctx = await resolveFromBearerToken(token);
    if (!ctx) {
      return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
    if (!roleAllows(allowedRoles, ctx.resolved.role)) {
      return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }
    return { ctx };
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const resolved = await resolveAppUserById(userId);
  if (!resolved) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!roleAllows(allowedRoles, resolved.role)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return {
    ctx: {
      user: { id: userId, email: resolved.email },
      resolved,
    },
  };
}

/** Admin/student sign-in for migration period (replaces Supabase signInWithPassword). */
export async function signInWithCredentials(
  email: string,
  password: string,
): Promise<{ userId: string; email: string } | null> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user?.passwordHash) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  return { userId: user.id, email: user.email };
}

export function getPrismaDb() {
  return prisma;
}
