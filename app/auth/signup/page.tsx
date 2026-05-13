'use client';

import { Suspense, useEffect, useState } from 'react';
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

function toFriendlySignupError(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Sign up failed. Please try again.';
  const normalized = raw.toLowerCase();
  if (normalized.includes('email rate limit') || normalized.includes('rate limit')) {
    return 'Signup traffic is high right now. Please try again shortly.';
  }
  if (normalized.includes('failed to fetch')) {
    return 'Network error while signing up. Please check your connection and try again.';
  }
  if (normalized.includes('already registered')) {
    return 'This email is already registered. Please sign in instead.';
  }
  return raw;
}

function SignUpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const postSignupPath = authRedirectTarget(redirectParam);
  const loginHref = redirectParam
    ? `/auth/login?redirect=${encodeURIComponent(redirectParam)}`
    : '/auth/login';

  if (isSignupDisabled()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-4">
        <Card className="w-full max-w-md border-white/20 bg-white/10 shadow-2xl backdrop-blur-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-3">Registration closed</h1>
          <p className="text-white/80 mb-6 text-sm leading-relaxed">
            New accounts cannot be created on the website right now. Please sign in with the email and password from your institution.
          </p>
          <Button
            className="w-full bg-indigo-500 hover:bg-indigo-400 text-white"
            onClick={() => router.push(`${loginHref}${loginHref.includes('?') ? '&' : '?'}notice=signup_closed`)}
          >
            Go to sign in
          </Button>
        </Card>
      </div>
    );
  }

  const isSupabaseConfigured = isSupabasePublicEnvConfigured();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Local-only convenience setup; disabled in production unless explicitly enabled.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (process.env.NEXT_PUBLIC_AUTO_DB_SETUP !== 'true') return;

    const initDb = async () => {
      try {
        // Initialize database with direct SQL
        const initResponse = await fetch('/api/setup/init-direct', { method: 'POST' });
        console.log('[v0] Init response:', initResponse.status);

        // Seed with sample data
        const seedResponse = await fetch('/api/setup/seed-direct', { method: 'POST' });
        console.log('[v0] Seed response:', seedResponse.status);
      } catch (err) {
        console.log('[v0] Setup info:', err);
      }
    };
    initDb();
  }, []);

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
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        throw new Error(SUPABASE_PUBLIC_ENV_MESSAGE);
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (!formData.fullName.trim()) {
        throw new Error('Full name is required');
      }

      // Use server signup API first (can create confirmed users when service role key is available).
      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          next: postSignupPath,
        }),
      });
      const signupJson = (await signupRes.json().catch(() => ({}))) as {
        error?: string;
        user_id?: string | null;
        email_confirmed?: boolean;
      };
      if (!signupRes.ok) {
        throw new Error(signupJson.error || 'Sign up failed. Please try again.');
      }

      const userId = signupJson.user_id ?? null;

      // Create user profile in database
      if (userId) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: userId,
              email: formData.email,
              full_name: formData.fullName,
              subscription_status: 'free',
            },
          ]);

        if (profileError) {
          console.warn('Profile creation warning:', profileError);
          // Don't fail if profile creation fails - user is already signed up
        }
      }

      // Sign in immediately; if backend still requires confirmation, route to login page.
      const signInResult = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (signInResult.error) {
        router.push(loginHref);
        return;
      }

      setError(null);
      router.push(postSignupPath);
    } catch (err) {
      const errorMsg = toFriendlySignupError(err);
      // Rate-limit and network failures are expected operational states; keep console quieter for users.
      if (!/too many signup attempts|signup traffic is high|network error|already registered/i.test(errorMsg)) {
        console.error('[v0] Sign up error:', errorMsg);
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-4">
      <Card className="w-full max-w-md border-white/20 bg-white/10 shadow-2xl backdrop-blur-2xl">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Join PrepIndia</h1>
          <p className="text-white/80 mb-6">Create your account to start preparing</p>

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
              <label htmlFor="fullName" className="block text-sm font-medium text-white mb-1">
                Full Name
              </label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                className="bg-white/10 text-white placeholder:text-white/60 border-white/40"
                required
              />
            </div>

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
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={handleChange}
                className="bg-white/10 text-white placeholder:text-white/60 border-white/40"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-1">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="bg-white/10 text-white placeholder:text-white/60 border-white/40"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !isSupabaseConfigured}
              className="w-full bg-indigo-500 hover:bg-indigo-400 text-white"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-white/80">
            Already have an account?{' '}
            <Link href={loginHref} className="text-blue-200 hover:text-white font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-4 text-white/70">
          Loading…
        </div>
      }
    >
      <SignUpPageContent />
    </Suspense>
  );
}
