'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { COLLEGE } from '@/lib/college-brand';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { SUPABASE_PUBLIC_ENV_MESSAGE } from '@/lib/supabase-public-env';
import type { CollegeSignupRole } from '@/lib/college-signup';

type SignUpOptions = {
  email: string;
  password: string;
  fullName: string;
  role: CollegeSignupRole;
  redirectTo?: string;
  metadata?: Record<string, string>;
};

export function useCollegeSignUp() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signUp = useCallback(
    async ({
      email,
      password,
      fullName,
      role,
      redirectTo = '/dashboard',
      metadata = {},
    }: SignUpOptions) => {
      setError(null);
      setLoading(true);
      try {
        const supabase = createSupabaseBrowserClient();
        if (!supabase) throw new Error(SUPABASE_PUBLIC_ENV_MESSAGE);

        const signupRes = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            fullName,
            role,
            next: redirectTo,
            metadata: { role, ...metadata },
          }),
        });

        const signupJson = (await signupRes.json().catch(() => ({}))) as {
          error?: string;
          user_id?: string | null;
        };

        if (!signupRes.ok) {
          throw new Error(signupJson.error || 'Registration failed. Please try again.');
        }

        const userId = signupJson.user_id ?? null;
        if (userId && role === 'student') {
          await supabase.from('users').upsert(
            {
              id: userId,
              email,
              full_name: fullName,
              branch: metadata.department ?? undefined,
              academic_year: metadata.year ?? undefined,
              user_role: 'student',
              college: COLLEGE.shortName,
              subscription_status: 'free',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' },
          );
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          const loginPath =
            role === 'student' ? '/auth/login/student' : '/auth/login/faculty';
          router.push(loginPath);
          return;
        }

        if (Object.keys(metadata).length > 0) {
          await supabase.auth.updateUser({ data: metadata });
        }

        if (role === 'faculty' && metadata.department) {
          await fetch('/api/faculty/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              department: metadata.department,
              employee_id: metadata.employee_id,
              full_name: fullName,
            }),
          });
        }

        router.push(redirectTo);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Registration failed');
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  return { signUp, loading, error, setError };
}
