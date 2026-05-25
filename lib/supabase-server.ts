import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
  isSupabasePublicEnvConfigured,
} from '@/lib/supabase-public-env';

export async function getSupabaseServerClient() {
  if (!isSupabasePublicEnvConfigured()) return null;

  const cookieStore = await cookies();
  return createServerClient(getPublicSupabaseUrl()!, getPublicSupabaseAnonKey()!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options });
          });
        } catch {
          /* read-only in some Server Components */
        }
      },
    },
  });
}
