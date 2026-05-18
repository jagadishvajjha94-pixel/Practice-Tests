import { NextResponse } from 'next/server';
import { checkIsAdmin } from '@/lib/admin-verify';
import { getServiceSupabase } from '@/lib/server-auth';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = getServiceSupabase();
  const isAdmin = await checkIsAdmin(service, user.id, user.email);

  return NextResponse.json({ isAdmin, email: user.email });
}
