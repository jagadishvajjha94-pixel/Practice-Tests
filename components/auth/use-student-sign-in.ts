'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SUPABASE_PUBLIC_ENV_MESSAGE } from '@/lib/supabase-public-env';
import { isSupabasePublicEnvConfigured } from '@/lib/supabase-public-env';

type StudentSignInOptions = {
  rollNumber: string;
  password: string;
  department?: string;
  year?: string;
  redirectTo?: string;
};

export function useStudentSignIn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(
    async ({
      rollNumber,
      password,
      department,
      year,
      redirectTo = '/exams',
    }: StudentSignInOptions) => {
      setError(null);
      setLoading(true);
      try {
        if (!isSupabasePublicEnvConfigured()) {
          throw new Error(SUPABASE_PUBLIC_ENV_MESSAGE);
        }

        const res = await fetch('/api/auth/student/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            rollNumber: rollNumber.trim(),
            password,
            department,
            year,
          }),
        });

        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };

        if (!res.ok) {
          throw new Error(json.error ?? 'Sign in failed');
        }

        router.push(redirectTo);
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sign in failed';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  return { signIn, loading, error, setError };
}
