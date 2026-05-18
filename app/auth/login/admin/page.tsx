'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PortalShell } from '@/components/auth/portal-shell';
import { AuthCard } from '@/components/auth/auth-card';
import {
  adminAuthEmail,
  validateAdminUsername,
  validatePassword,
} from '@/lib/college-auth';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import {
  isSupabasePublicEnvConfigured,
  SUPABASE_PUBLIC_ENV_MESSAGE,
} from '@/lib/supabase-public-env';

function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const verifyAdmin = async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) throw new Error(SUPABASE_PUBLIC_ENV_MESSAGE);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Login failed');

    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminRow) {
      router.push('/admin/dashboard');
      return;
    }

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (token) {
      const promoteRes = await fetch('/api/admin/bootstrap', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (promoteRes.ok) {
        router.push('/admin/dashboard');
        return;
      }
    }

    throw new Error('This account does not have admin access. Contact the examination cell.');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errs: Record<string, string> = {};
    const userErr = validateAdminUsername(username);
    const passErr = validatePassword(password);
    if (userErr) errs.username = userErr;
    if (passErr) errs.password = passErr;
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    if (!isSupabasePublicEnvConfigured()) {
      setError(SUPABASE_PUBLIC_ENV_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error(SUPABASE_PUBLIC_ENV_MESSAGE);

      const email = adminAuthEmail(username);
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error(signInError.message);

      await verifyAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalShell showBackToRoles>
      <AuthCard
        title="Admin Sign In"
        description="Examination cell and system administrators."
      >
        <form onSubmit={onSubmit} className="space-y-4 text-left">
          {error ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          ) : null}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
              Admin Username
            </label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Examination cell username"
              className="bg-white border-slate-300"
              autoComplete="username"
              required
            />
            {fieldErrors.username ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.username}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white border-slate-300"
              autoComplete="current-password"
              required
            />
            {fieldErrors.password ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1e3a5f] hover:bg-[#16304f] text-white"
          >
            {loading ? 'Signing in…' : 'Sign in to admin panel'}
          </Button>

          <p className="text-xs text-center text-slate-500">
            First-time setup?{' '}
            <Link href="/auth/admin/login" className="text-[#1e3a5f] hover:underline">
              Legacy admin setup
            </Link>
          </p>
        </form>
      </AuthCard>
    </PortalShell>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="portal-auth min-h-screen flex items-center justify-center text-slate-700 font-medium">
          Loading…
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
