import { createServerClient, type CookieOptions } from '@supabase/ssr';
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
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          /* read-only in Server Components */
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          /* read-only */
        }
      },
    },
  });
}
