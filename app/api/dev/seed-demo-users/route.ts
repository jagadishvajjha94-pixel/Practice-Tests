import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  DEMO_ADMIN_EMAIL,
  DEMO_PASSWORD,
  DEMO_SWARX_EMAIL,
  DEMO_STUDENT_EMAIL,
} from '@/lib/demo-accounts';

const STUDENT_EMAIL = DEMO_STUDENT_EMAIL;
const SWARX_EMAIL = DEMO_SWARX_EMAIL;
const ADMIN_EMAIL = DEMO_ADMIN_EMAIL;

function isSeedAllowed(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.ALLOW_DEMO_SEED === 'true'
  );
}

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return Boolean(
    url &&
      service &&
      url.includes('.supabase.co') &&
      !url.includes('YOUR_') &&
      !service.includes('YOUR_')
  );
}

function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}

async function findUserIdByEmail(
  admin: SupabaseClient,
  email: string
): Promise<string | null> {
  const normalized = email.toLowerCase();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (hit) return hit.id;
    if ((data.users?.length ?? 0) < perPage) return null;
    page += 1;
  }
}

async function ensureAuthUser(
  admin: SupabaseClient,
  opts: { email: string; password: string; fullName: string }
): Promise<string> {
  const existingId = await findUserIdByEmail(admin, opts.email);
  if (existingId) {
    const { error } = await admin.auth.admin.updateUserById(existingId, {
      password: opts.password,
      email_confirm: true,
      user_metadata: { full_name: opts.fullName },
    });
    if (error) throw error;
    return existingId;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: opts.email,
    password: opts.password,
    email_confirm: true,
    user_metadata: { full_name: opts.fullName },
  });
  if (error) throw error;
  if (!data.user?.id) throw new Error('createUser did not return a user id');
  return data.user.id;
}

export async function GET() {
  if (!isSeedAllowed()) {
    return NextResponse.json({ error: 'Not available outside development' }, { status: 403 });
  }

  return NextResponse.json({
    message:
      'POST to create or reset demo users. Requires DATABASE users + admin_users table (run /setup with POSTGRES_URL or init SQL).',
    method: 'POST',
    demoAccounts: {
      student: { email: STUDENT_EMAIL, password: DEMO_PASSWORD },
      swarx: { email: SWARX_EMAIL, password: DEMO_PASSWORD },
      admin: { email: ADMIN_EMAIL, password: DEMO_PASSWORD },
    },
  });
}

export async function POST() {
  try {
    if (!isSeedAllowed()) {
      return NextResponse.json({ error: 'Not available outside development' }, { status: 403 });
    }
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local',
        },
        { status: 500 }
      );
    }

    const admin = serviceClient();

    const studentId = await ensureAuthUser(admin, {
      email: STUDENT_EMAIL,
      password: DEMO_PASSWORD,
      fullName: 'Demo Student',
    });
    const adminUserId = await ensureAuthUser(admin, {
      email: ADMIN_EMAIL,
      password: DEMO_PASSWORD,
      fullName: 'Demo Admin',
    });
    const swarxUserId = await ensureAuthUser(admin, {
      email: SWARX_EMAIL,
      password: DEMO_PASSWORD,
      fullName: 'Demo SWARX User',
    });

    const { error: profilesError } = await admin.from('users').upsert(
      [
        {
          id: studentId,
          email: STUDENT_EMAIL,
          full_name: 'Demo Student',
          subscription_status: 'free',
        },
        {
          id: adminUserId,
          email: ADMIN_EMAIL,
          full_name: 'Demo Admin',
          subscription_status: 'free',
        },
        {
          id: swarxUserId,
          email: SWARX_EMAIL,
          full_name: 'Demo SWARX User',
          subscription_status: 'free',
        },
      ],
      { onConflict: 'id' }
    );

    if (profilesError) {
      return NextResponse.json(
        {
          error:
            'Auth users created but profile upsert failed. Ensure public.users exists (initialize DB via /setup with POSTGRES_URL).',
          details: profilesError.message,
          authOnly: true,
          userIds: { studentId, swarxUserId, adminUserId },
        },
        { status: 500 }
      );
    }

    const { error: adminRowError } = await admin.from('admin_users').upsert(
      { user_id: adminUserId, role: 'admin' },
      { onConflict: 'user_id' }
    );

    if (adminRowError) {
      return NextResponse.json(
        {
          partial: true,
          message:
            'Student + admin profiles ready; admin_users row failed. Add admin_users table (init-direct includes it) then POST again.',
          details: adminRowError.message,
          demoAccounts: {
            student: { email: STUDENT_EMAIL, password: DEMO_PASSWORD },
            swarx: { email: SWARX_EMAIL, password: DEMO_PASSWORD },
            admin: { email: ADMIN_EMAIL, password: DEMO_PASSWORD },
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        'Demo users ready. Sign in at /auth/login with either account (same password).',
      demoAccounts: {
        student: { email: STUDENT_EMAIL, password: DEMO_PASSWORD },
        swarx: { email: SWARX_EMAIL, password: DEMO_PASSWORD },
        admin: { email: ADMIN_EMAIL, password: DEMO_PASSWORD },
      },
      note: 'For production, remove ALLOW_DEMO_SEED and revoke these accounts.',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
