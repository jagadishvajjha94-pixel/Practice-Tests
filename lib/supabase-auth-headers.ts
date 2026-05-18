import type { SupabaseClient } from '@supabase/supabase-js';

/** Attach session JWT for API routes when cookies are unreliable (e.g. Vercel edge). */
export async function getSupabaseAuthHeaders(
  supabase: SupabaseClient,
): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
