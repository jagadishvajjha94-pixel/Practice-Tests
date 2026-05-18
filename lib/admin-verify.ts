import type { SupabaseClient } from '@supabase/supabase-js';

function getAllowlistedAdminEmails(): string[] {
  const fromEnv = process.env.PREPINDIA_ADMIN_EMAIL?.trim().toLowerCase();
  const defaults = ['admin@prepindia.local'];
  return [...new Set([...defaults, ...(fromEnv ? [fromEnv] : [])])];
}

function isAllowlistedAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return getAllowlistedAdminEmails().includes(normalized);
}

function isMissingAdminTableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('admin_users') &&
    (m.includes('schema cache') || m.includes('does not exist') || m.includes('could not find'))
  );
}

/** Grant admin when DB table is unavailable but email is allowlisted (dev / migration recovery). */
export async function ensureAdminAccess(
  admin: SupabaseClient,
  userId: string,
  email: string | undefined,
): Promise<{ isAdmin: boolean; via: 'table' | 'allowlist' | 'none' }> {
  const { data, error } = await admin
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!error && data) {
    return { isAdmin: true, via: 'table' };
  }

  if (error && !isMissingAdminTableError(String(error.message ?? ''))) {
    return { isAdmin: false, via: 'none' };
  }

  if (!isAllowlistedAdminEmail(email)) {
    return { isAdmin: false, via: 'none' };
  }

  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { role: 'admin', full_name: 'Main Admin' },
  });

  const { error: insertError } = await admin
    .from('admin_users')
    .upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id' });

  if (!insertError) {
    return { isAdmin: true, via: 'table' };
  }

  return { isAdmin: true, via: 'allowlist' };
}

export async function checkIsAdmin(
  admin: SupabaseClient | null,
  userId: string,
  email: string | undefined,
): Promise<boolean> {
  if (!admin) {
    return isAllowlistedAdminEmail(email);
  }
  const result = await ensureAdminAccess(admin, userId, email);
  return result.isAdmin;
}
