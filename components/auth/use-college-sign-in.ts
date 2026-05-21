'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { SUPABASE_PUBLIC_ENV_MESSAGE } from '@/lib/supabase-public-env';

type SignInOptions = {
  email: string;
  password: string;
  redirectTo?: string;
  metadata?: Record<string, string>;
};

export function useCollegeSignIn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(
    async ({ email, password, redirectTo = '/home', metadata }: SignInOptions) => {
      setError(null);
      setLoading(true);
      try {
        const supabase = createSupabaseBrowserClient();
        if (!supabase) throw new Error(SUPABASE_PUBLIC_ENV_MESSAGE);

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw new Error(signInError.message);
        if (!data.user) throw new Error('Login failed');

        if (metadata && Object.keys(metadata).length > 0) {
          await supabase.auth.updateUser({ data: metadata });
          await supabase
            .from('users')
            .upsert(
              {
                id: data.user.id,
                email: data.user.email ?? email,
                full_name: metadata.full_name ?? data.user.user_metadata?.full_name,
                branch: metadata.department ?? undefined,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' },
            )
            .then(() => undefined);
        }

        router.push(redirectTo);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sign in failed';
        setError(
          /invalid login credentials/i.test(msg)
            ? 'Invalid roll number or password.'
            : msg,
        );
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  return { signIn, loading, error, setError };
}
