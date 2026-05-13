'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import {
  isSupabasePublicEnvConfigured,
  SUPABASE_PUBLIC_ENV_MESSAGE,
} from '@/lib/supabase-public-env';
import { isSignupDisabled } from '@/lib/auth-features';

function authRedirectTarget(raw: string | null, fallback = '/dashboard'): string {
  if (!raw || typeof raw !== 'string') return fallback;
  const t = raw.trim();
  if (!t.startsWith('/') || t.startsWith('//')) return fallback;
  return t;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const notice = searchParams.get('notice');
  const postLoginPath = authRedirectTarget(redirectParam);
  const signupDisabled = isSignupDisabled();
  const signupHref = redirectParam
    ? `/auth/signup?redirect=${encodeURIComponent(redirectParam)}`
    : '/auth/signup';
  const isSupabaseConfigured = isSupabasePublicEnvConfigured();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signInWithEmailPassword = async (email: string, password: string) => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      throw new Error(SUPABASE_PUBLIC_ENV_MESSAGE);
    }
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) throw new Error(signInError.message);

    if (!data.user) {
      throw new Error('Login failed: No user found');
    }

    router.push(postLoginPath);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured) {
      setError(SUPABASE_PUBLIC_ENV_MESSAGE);
      return;
    }
    setLoading(true);

    try {
      await signInWithEmailPassword(formData.email, formData.password);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-white/25 bg-white/12 shadow-2xl backdrop-blur-2xl">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Student sign in</h1>
          <p className="text-white/80 mb-6">
            Use the email and password you were given. If login fails, wait a moment and try again — many students may sign in at the same time.
          </p>

          {notice === 'signup_closed' ? (
            <div className="mb-4 p-3 rounded-lg border border-amber-300/50 bg-amber-500/15 text-sm text-amber-50">
              New registrations are closed for now. Please sign in with your existing account.
            </div>
          ) : null}

          {error && (
            <div className="mb-4 p-3 bg-red-500/15 border border-red-300/40 rounded-lg text-sm text-red-100">
              {error}
            </div>
          )}
          {!isSupabaseConfigured && !error && (
            <div className="mb-4 p-3 bg-amber-400/15 border border-amber-300/40 rounded-lg text-sm text-amber-100">
              {SUPABASE_PUBLIC_ENV_MESSAGE}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-1">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                className="bg-white/10 text-white placeholder:text-white/60 border-white/40"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-1">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                className="bg-white/10 text-white placeholder:text-white/60 border-white/40"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !isSupabaseConfigured}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>

            <Link href="/auth/login?redirect=/admin" className="block">
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/40 bg-white/10 text-white hover:bg-white/20"
              >
                Admin login
              </Button>
            </Link>
          </form>

          <div className="mt-4 text-center">
            <Link href="/auth/forgot-password" className="text-sm text-blue-200 hover:text-white">
              Forgot password?
            </Link>
          </div>

          {!signupDisabled ? (
            <p className="mt-6 text-center text-sm text-white/80">
              Don&apos;t have an account?{' '}
              <Link href={signupHref} className="text-blue-200 hover:text-white font-medium">
                Sign up
              </Link>
            </p>
          ) : (
            <p className="mt-6 text-center text-sm text-white/60">
              Need an account? Contact your coordinator — online signup is temporarily disabled.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4 text-white/70">
          Loading…
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
