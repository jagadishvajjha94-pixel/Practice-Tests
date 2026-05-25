import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { getSupabaseAuthHeaders } from '@/lib/supabase-auth-headers';

/** Browser fetch to app APIs with session cookies and Bearer fallback (Vercel-safe). */
export async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    const authHeaders = await getSupabaseAuthHeaders(supabase);
    for (const [key, value] of Object.entries(authHeaders)) {
      headers.set(key, value);
    }
  }
  return fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  });
}
