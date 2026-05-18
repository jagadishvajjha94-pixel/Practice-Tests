import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/admin-access';
import { resolveAppUser, type AppRole, type ResolvedUser } from '@/lib/roles';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export type AuthContext = {
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;
  user: { id: string; email?: string };
  resolved: ResolvedUser;
};

export async function requireAuth(
  allowedRoles?: AppRole[],
): Promise<{ ctx: AuthContext } | { response: NextResponse }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { response: NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 }) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const resolved = await resolveAppUser(supabase);
  if (!resolved) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
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
