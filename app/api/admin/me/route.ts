import { NextRequest, NextResponse } from 'next/server';
import { checkIsAdmin } from '@/lib/admin-verify';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getAdminSupabase } from '@/lib/admin-access';

export async function GET(request: NextRequest) {
  const adminClient = getAdminSupabase();
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();

  let user: { id: string; email?: string | null } | null = null;

  if (bearer && adminClient) {
    const { data, error } = await adminClient.auth.getUser(bearer);
    if (!error && data.user) user = data.user;
  }

  if (!user) {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ isAdmin: false, authenticated: false });
    }
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  if (!user) {
    return NextResponse.json({ isAdmin: false, authenticated: false });
  }

  const service = getAdminSupabase();
  const isAdmin = await checkIsAdmin(service, user.id, user.email ?? undefined);

  return NextResponse.json({
    isAdmin,
    authenticated: true,
    role: isAdmin ? 'admin' : null,
    email: user.email,
  });
}
