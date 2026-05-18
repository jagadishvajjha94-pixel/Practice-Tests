import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getPublicSupabaseUrl } from '@/lib/supabase-public-env';

export function getServiceRoleKey(): string | undefined {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!raw || raw.includes('YOUR_')) return undefined;
  return raw;
}

export function getAdminSupabase(): SupabaseClient | null {
  const url = getPublicSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function findAuthUserByEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  email: string,
): Promise<{ id: string; email?: string } | null> {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  if (!res.ok) return null;
  const payload = (await res.json().catch(() => ({}))) as {
    users?: Array<{ id?: string; email?: string }>;
  };
  if (!Array.isArray(payload.users)) return null;
  const match = payload.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
  return match?.id ? { id: match.id, email: match.email } : null;
}

export async function createConfirmedAuthUser(
  supabaseUrl: string,
  serviceRoleKey: string,
  email: string,
  password: string,
  fullName: string,
): Promise<{ id: string } | { error: string }> {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
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

  if (res.ok) {
    const data = (await res.json()) as { id?: string };
    if (data.id) return { id: data.id };
  }

  const existing = await findAuthUserByEmail(supabaseUrl, serviceRoleKey, email);
  if (!existing) {
    const errBody = (await res.json().catch(() => ({}))) as { msg?: string; message?: string };
    return { error: errBody.msg ?? errBody.message ?? 'Could not create admin user' };
  }

  const updateRes = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(existing.id)}`,
    {
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
    },
  );

  if (!updateRes.ok) {
    return { error: 'User exists but password could not be updated' };
  }

  return { id: existing.id };
}

export async function upsertPublicUser(
  admin: SupabaseClient,
  userId: string,
  email: string,
  fullName: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await admin.from('users').upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (!error) return { ok: true };

  const msg = String(error.message ?? '').toLowerCase();
  if (msg.includes('users') && (msg.includes('schema') || msg.includes('does not exist'))) {
    return { ok: false, error: 'public.users table missing — run /api/setup/ensure-users first' };
  }

  return { ok: false, error: error.message };
}

export async function grantAdminRole(
  admin: SupabaseClient,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await admin.from('admin_users').upsert(
    { user_id: userId, role: 'admin' },
    { onConflict: 'user_id' },
  );

  if (!error) return { ok: true };

  const msg = String(error.message ?? '').toLowerCase();
  if (msg.includes('admin_users') && (msg.includes('schema') || msg.includes('does not exist'))) {
    return { ok: false, error: 'admin_users table missing — run /api/setup/ensure-admin first' };
  }

  return { ok: false, error: error.message };
}

export async function isUserAdmin(
  admin: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}
