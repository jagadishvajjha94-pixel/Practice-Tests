import { NextRequest, NextResponse } from 'next/server';
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
  SUPABASE_PUBLIC_ENV_MESSAGE,
} from '@/lib/supabase-public-env';
import { isSignupDisabled } from '@/lib/auth-features';

type SignupBody = {
  email?: string;
  password?: string;
  fullName?: string;
  next?: string;
};

function safeNextPath(next: unknown): string {
  if (typeof next !== 'string') return '/dashboard';
  const trimmed = next.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/dashboard';
  return trimmed;
}

function getServiceRoleKey(): string | undefined {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!raw || raw.includes('YOUR_')) return undefined;
  return raw;
}

async function findAdminUserByEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  email: string
): Promise<{ id?: string } | null> {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  if (!res.ok) return null;
  const payload = (await res.json().catch(() => ({}))) as { users?: Array<{ id?: string; email?: string }> };
  if (!Array.isArray(payload.users)) return null;
  return payload.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase()) ?? null;
}

async function confirmAndResetExistingUser(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  password: string,
  fullName: string
): Promise<boolean> {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_confirm: true,
      password,
      user_metadata: { full_name: fullName },
    }),
  });
  return res.ok;
}

export async function POST(request: NextRequest) {
  if (isSignupDisabled()) {
    return NextResponse.json(
      {
        error:
          'New registrations are closed right now. Please sign in with the account you were given.',
      },
      { status: 403 }
    );
  }

  const supabaseUrl = getPublicSupabaseUrl();
  const supabaseAnonKey = getPublicSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: SUPABASE_PUBLIC_ENV_MESSAGE }, { status: 500 });
  }

  let body: SignupBody;
  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password ?? '';
  const fullName = body.fullName?.trim();

  if (!email || !password || !fullName) {
    return NextResponse.json({ error: 'Email, password, and full name are required.' }, { status: 400 });
  }

  const next = safeNextPath(body.next);
  const emailRedirectTo = `${request.nextUrl.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const serviceRoleKey = getServiceRoleKey();

  try {
    // Preferred path: create a confirmed user via server-side admin API (no email confirmation needed).
    if (serviceRoleKey) {
      const adminRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        }),
      });

      const adminPayload = (await adminRes.json().catch(() => ({}))) as Record<string, unknown>;
      if (!adminRes.ok) {
        const message =
          (typeof adminPayload.msg === 'string' && adminPayload.msg) ||
          (typeof adminPayload.error_description === 'string' && adminPayload.error_description) ||
          (typeof adminPayload.error === 'string' && adminPayload.error) ||
          'Sign up failed.';
        const normalized = message.toLowerCase();
        if (normalized.includes('already') || normalized.includes('registered') || normalized.includes('exists')) {
          const existing = await findAdminUserByEmail(supabaseUrl, serviceRoleKey, email);
          if (existing?.id) {
            const recovered = await confirmAndResetExistingUser(
              supabaseUrl,
              serviceRoleKey,
              existing.id,
              password,
              fullName
            );
            if (recovered) {
              return NextResponse.json({
                ok: true,
                user_id: existing.id,
                email_confirmed: true,
                recovered_existing: true,
              });
            }
          }
          return NextResponse.json(
            { error: 'This email is already registered. Please sign in instead.' },
            { status: 409 }
          );
        }
        if (normalized.includes('rate limit')) {
          return NextResponse.json({ error: 'Signup traffic is high right now. Please try again shortly.' }, { status: 429 });
        }
        return NextResponse.json({ error: message }, { status: adminRes.status });
      }

      const createdUser = adminPayload.user as { id?: string } | undefined;
      return NextResponse.json({ ok: true, user_id: createdUser?.id ?? null, email_confirmed: true });
    }

    // Fallback path if service role key is unavailable: regular Supabase signup (may require confirmation).
    const authRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        data: { full_name: fullName },
        options: { emailRedirectTo },
      }),
    });

    const payload = (await authRes.json().catch(() => ({}))) as Record<string, unknown>;
    if (!authRes.ok) {
      const message =
        (typeof payload.msg === 'string' && payload.msg) ||
        (typeof payload.error_description === 'string' && payload.error_description) ||
        (typeof payload.error === 'string' && payload.error) ||
        'Sign up failed.';
      const normalized = message.toLowerCase();
      if (normalized.includes('email rate limit') || normalized.includes('rate limit')) {
        return NextResponse.json(
          {
            error: 'Signup traffic is high right now. Please try again shortly.',
          },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: message }, { status: authRes.status });
    }

    return NextResponse.json({ ok: true, email_confirmed: false });
  } catch {
    return NextResponse.json(
      {
        error: 'Unable to reach Supabase auth service from server.',
      },
      { status: 502 }
    );
  }
}

