import { NextResponse } from 'next/server';
import type { AppRole, ResolvedUser } from '@/lib/roles';
import { requirePrismaAuth } from '@/lib/server-auth-prisma';
import { useAwsStack } from '@/lib/aws/stack';
import { getAdminSupabase } from '@/lib/admin-access';
import { createPrismaServiceClient } from '@/lib/db/prisma-service-client';

export type AuthContext = {
  supabase: ReturnType<typeof createPrismaServiceClient> | ReturnType<typeof getAdminSupabase>;
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
      supabase: getServiceSupabase(),
      user: prismaAuth.ctx.user,
      resolved: prismaAuth.ctx.resolved,
    },
  };
}

/** Service-role DB client: Prisma/RDS on AWS, Supabase admin when legacy env is set. */
export function getServiceSupabase() {
  if (useAwsStack()) {
    return createPrismaServiceClient();
  }
  return getAdminSupabase();
}
