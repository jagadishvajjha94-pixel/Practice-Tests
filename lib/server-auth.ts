import { NextResponse } from 'next/server';
import type { AppRole, ResolvedUser } from '@/lib/roles';
import { requirePrismaAuth } from '@/lib/server-auth-prisma';

export type AuthContext = {
  supabase: any;
  user: { id: string; email?: string };
  resolved: ResolvedUser;
};

export async function requireAuth(
  allowedRoles?: AppRole[],
  request?: Request,
): Promise<{ ctx: AuthContext } | { response: NextResponse }> {
  const prismaAuth = await requirePrismaAuth(allowedRoles, request);
  if ('response' in prismaAuth) return prismaAuth;
  return {
    ctx: {
      supabase: null,
      user: prismaAuth.ctx.user,
      resolved: prismaAuth.ctx.resolved,
    },
  };
}

export function getServiceSupabase(): any {
  return null;
}
