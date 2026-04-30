'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import {
  DEMO_ADMIN_EMAIL,
  DEMO_PASSWORD,
  DEMO_SWARX_EMAIL,
  DEMO_STUDENT_EMAIL,
} from '@/lib/demo-accounts';

const showDemoLogin =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN === 'true';

function isConfiguredValue(v: string | undefined) {
  if (!v) return false;
  const trimmed = v.trim();
  if (!trimmed) return false;
  if (trimmed.includes('YOUR_')) return false;
  return true;
}

export default function LoginPage() {
  const router = useRouter();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isSupabaseConfigured = isConfiguredValue(supabaseUrl) && isConfiguredValue(supabaseAnonKey);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoSeedMessage, setDemoSeedMessage] = useState<string | null>(null);
  const [demoSeeding, setDemoSeeding] = useState(false);

  const signInWithEmailPassword = async (email: string, password: string) => {
    const supabase = createSupabaseBrowserClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) throw new Error(signInError.message);

    if (!data.user) {
      throw new Error('Login failed: No user found');
    }

    router.push('/dashboard');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured) {
      setError(
        'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (local: .env.local, production: Vercel Environment Variables).'
      );
      return;
    }
    setLoading(true);

    try {
      await signInWithEmailPassword(formData.email, formData.password);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      console.error('[v0] Login error:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSeed = async () => {
    setDemoSeedMessage(null);
    setDemoSeeding(true);
    try {
      const res = await fetch('/api/dev/seed-demo-users', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setDemoSeedMessage(
          typeof json.error === 'string'
            ? json.error
            : 'Could not create demo users. Ensure DB tables exist (/setup + POSTGRES_URL).'
        );
        return;
      }
      setDemoSeedMessage(json.message ?? 'Demo users are ready.');
    } catch {
      setDemoSeedMessage('Request failed. Is the dev server running?');
    } finally {
      setDemoSeeding(false);
    }
  };

  const handleQuickDemo = async (email: string) => {
    if (!isSupabaseConfigured) return;
    setError(null);
    setLoading(true);
    try {
      setFormData({ email, password: DEMO_PASSWORD });
      await signInWithEmailPassword(email, DEMO_PASSWORD);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Demo sign-in failed.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <Card className="w-full max-w-md">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600 mb-6">Sign in to your account to continue</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          {!isSupabaseConfigured && !error && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
              in `.env.local` (local) or in Vercel Environment Variables (production)
              to enable sign in.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !isSupabaseConfigured}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
              Forgot password?
            </Link>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign up
            </Link>
          </p>

          {showDemoLogin && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Demo login (testing)
              </p>
              <p className="text-xs text-gray-600 mb-3">
                Password for both accounts:{' '}
                <code className="bg-gray-100 px-1 py-0.5 rounded">{DEMO_PASSWORD}</code>
              </p>
              <ul className="text-xs text-gray-700 space-y-1 mb-4 font-mono break-all">
                <li>
                  <span className="text-gray-500">Student:</span> {DEMO_STUDENT_EMAIL}
                </li>
                <li>
                  <span className="text-gray-500">SWARX:</span> {DEMO_SWARX_EMAIL}
                </li>
                <li>
                  <span className="text-gray-500">Admin:</span> {DEMO_ADMIN_EMAIL}
                </li>
              </ul>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || demoSeeding || !isSupabaseConfigured}
                  className="w-full border-dashed"
                  onClick={() => handleQuickDemo(DEMO_STUDENT_EMAIL)}
                >
                  Sign in as demo student
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || demoSeeding || !isSupabaseConfigured}
                  className="w-full border-dashed"
                  onClick={() => handleQuickDemo(DEMO_ADMIN_EMAIL)}
                >
                  Sign in as demo admin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || demoSeeding || !isSupabaseConfigured}
                  className="w-full border-dashed"
                  onClick={() => handleQuickDemo(DEMO_SWARX_EMAIL)}
                >
                  Sign in as demo SWARX user
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={demoSeeding || loading || !isSupabaseConfigured}
                  className="w-full text-sm"
                  onClick={handleDemoSeed}
                >
                  {demoSeeding ? 'Creating demo users…' : 'Create / reset demo users (API)'}
                </Button>
              </div>
              {demoSeedMessage && (
                <p className="mt-2 text-xs text-gray-600">{demoSeedMessage}</p>
              )}
              <p className="mt-2 text-[11px] text-gray-500">
                Shown because you are in development or{' '}
                <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_SHOW_DEMO_LOGIN=true</code>.
                Requires Supabase keys and{' '}
                <Link href="/setup" className="text-blue-600 underline">
                  DB setup
                </Link>{' '}
                for first-time installs.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
