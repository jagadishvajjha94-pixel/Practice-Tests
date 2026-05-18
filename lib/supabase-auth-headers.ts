import type { SupabaseClient } from '@supabase/supabase-js';

/** Attach session JWT for API routes when cookies are unreliable (e.g. Vercel edge). */
export async function getSupabaseAuthHeaders(
  supabase: SupabaseClient,
): Promise<Record<string, string>> {
  let { data } = await supabase.auth.getSession();
  let token = data.session?.access_token;

  if (!token) {
    const refreshed = await supabase.auth.refreshSession();
    token = refreshed.data.session?.access_token;
  }

  if (!token) {
    const userRes = await supabase.auth.getUser();
    if (userRes.data.user) {
      const retry = await supabase.auth.getSession();
      token = retry.data.session?.access_token;
    }
  }

  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
