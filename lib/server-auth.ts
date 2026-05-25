import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getAdminSupabase } from '@/lib/admin-access';
import { resolveAppUser, resolveAppUserFromAuthUser, type AppRole, type ResolvedUser } from '@/lib/roles';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export type AuthContext = {
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;
  user: { id: string; email?: string };
  resolved: ResolvedUser;
};

async function authContextFromUser(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>,
  user: User,
  allowedRoles?: AppRole[],
): Promise<{ ctx: AuthContext } | { response: NextResponse }> {
  const resolved =
    (await resolveAppUserFromAuthUser(supabase, user)) ??
    ({
      id: user.id,
      email: user.email ?? '',
      role: 'student' as const,
    } satisfies ResolvedUser);

  if (allowedRoles && !allowedRoles.includes(resolved.role)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return {
    ctx: {
      supabase,
      user: { id: user.id, email: user.email },
      resolved,
    },
  };
}

export async function requireAuth(
  allowedRoles?: AppRole[],
  request?: Request,
): Promise<{ ctx: AuthContext } | { response: NextResponse }> {
  const bearer = request?.headers.get('Authorization');
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7).trim() : null;

  if (token) {
    const service = getAdminSupabase();
    if (!service) {
      return { response: NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 }) };
    }
    const { data, error } = await service.auth.getUser(token);
    if (error || !data.user?.id) {
      return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return { response: NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 }) };
    }
    return authContextFromUser(supabase, data.user, allowedRoles);
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { response: NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 }) };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  let user = session?.user ?? null;
  if (!user) {
    const userRes = await supabase.auth.getUser();
    user = userRes.data.user ?? null;
  }

  if (!user?.id) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const resolved = await resolveAppUser(supabase);
  if (!resolved) {
    return authContextFromUser(supabase, user, allowedRoles);
  }

  if (allowedRoles && !allowedRoles.includes(resolved.role)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return {
    ctx: {
      supabase,
      user: { id: user.id, email: user.email },
      resolved,
    },
  };
}

export function getServiceSupabase() {
  return getAdminSupabase();
}
