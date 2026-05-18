import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getAdminSupabase, isUserAdmin } from '@/lib/admin-access';

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

  const supabase = await getSupabaseServerClient();
  const { data: row, error } = supabase
    ? await supabase.from('admin_users').select('id, role').eq('user_id', user.id).maybeSingle()
    : { data: null, error: null };

  if (!error && row) {
    return NextResponse.json({
      isAdmin: true,
      authenticated: true,
      role: row.role ?? 'admin',
      email: user.email,
    });
  }

  const admin = getAdminSupabase();
  if (admin) {
    const elevated = await isUserAdmin(admin, user.id);
    if (elevated) {
      return NextResponse.json({
        isAdmin: true,
        authenticated: true,
        role: 'admin',
        email: user.email,
      });
    }
  }

  return NextResponse.json({ isAdmin: false, authenticated: true, email: user.email });
}
