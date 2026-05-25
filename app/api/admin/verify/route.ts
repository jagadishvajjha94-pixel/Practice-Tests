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

  if (!isAdmin) {
    return NextResponse.json(
      {
        isAdmin: false,
        email: user.email,
        error:
          'This account does not have admin access. Contact the examination cell if you need access.',
      },
      { status: 403 },
    );
  }

  return NextResponse.json({ isAdmin: true, email: user.email });
}
