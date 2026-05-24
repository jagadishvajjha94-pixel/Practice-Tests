import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
  isSupabasePublicEnvConfigured,
  SUPABASE_PUBLIC_ENV_MESSAGE,
} from '@/lib/supabase-public-env';
import { DEFAULT_ADMIN_EMAIL } from '@/lib/admin-defaults';

export async function POST(request: NextRequest) {
  if (!isSupabasePublicEnvConfigured()) {
    return NextResponse.json({ error: SUPABASE_PUBLIC_ENV_MESSAGE }, { status: 500 });
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const supabaseUrl = getPublicSupabaseUrl()!;
  const supabaseAnonKey = getPublicSupabaseAnonKey()!;

  let cookieResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookieResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    const hint =
      email !== DEFAULT_ADMIN_EMAIL
        ? ` Use the admin email issued by the examination cell.`
        : ' Contact the examination cell if you need access.';
    return NextResponse.json(
      {
        error: error?.message ?? 'Invalid login credentials',
        hint,
        attemptedEmail: email,
      },
      { status: 401 },
    );
  }

  const jsonResponse = NextResponse.json({
    success: true,
    email: data.user.email,
    userId: data.user.id,
  });

  cookieResponse.cookies.getAll().forEach((cookie) => {
    jsonResponse.cookies.set(cookie);
  });

  return jsonResponse;
}
