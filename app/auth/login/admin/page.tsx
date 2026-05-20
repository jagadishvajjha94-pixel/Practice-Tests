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
import { StatusAlert } from '@/components/ui/status-alert';
import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
} from '@/lib/admin-defaults';

function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const onBootstrapAdmin = async () => {
    setError(null);
    setSuccess(null);
    setBootstrapping(true);
    try {
      const res = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: DEFAULT_ADMIN_EMAIL,
          password: DEFAULT_ADMIN_PASSWORD,
          fullName: 'RCE Training & Placement Admin',
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error ?? 'Could not create admin account');
      setUsername(DEFAULT_ADMIN_EMAIL);
      setPassword(DEFAULT_ADMIN_PASSWORD);
      setSuccess(
        json.message ??
          `Default admin ready. Sign in with ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setBootstrapping(false);
    }
  };

  const verifyAdmin = async () => {
    const verifyRes = await fetch('/api/admin/verify', { method: 'POST' });
    const verifyJson = (await verifyRes.json().catch(() => ({}))) as {
      isAdmin?: boolean;
      error?: string;
    };

    if (verifyRes.ok && verifyJson.isAdmin) {
      router.push('/admin/dashboard');
      return;
    }

    throw new Error(
      verifyJson.error ??
        `This account does not have admin access. Use ${DEFAULT_ADMIN_EMAIL} or contact the examination cell.`,
    );
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

      const trimmed = username.trim();
      const email = trimmed.includes('@') ? trimmed.toLowerCase() : adminAuthEmail(trimmed);
      if (!trimmed.includes('@')) {
        throw new Error(
          `Enter the full admin email (e.g. ${DEFAULT_ADMIN_EMAIL}). Username-only login maps to @admin.ramachandra.edu and will not work for the default admin.`,
        );
      }
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
          {error ? <StatusAlert variant="error">{error}</StatusAlert> : null}
          {success ? <StatusAlert variant="success">{success}</StatusAlert> : null}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
              Admin email
            </label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={DEFAULT_ADMIN_EMAIL}
              className="bg-white border-slate-300"
              autoComplete="username"
              required
            />
            {fieldErrors.username ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.username}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                Default: <span className="font-mono">{DEFAULT_ADMIN_EMAIL}</span> /{' '}
                <span className="font-mono">{DEFAULT_ADMIN_PASSWORD}</span>
              </p>
            )}
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

          <Button
            type="button"
            variant="outline"
            disabled={bootstrapping || loading}
            onClick={onBootstrapAdmin}
            className="w-full border-slate-300"
          >
            {bootstrapping ? 'Setting up…' : 'Create / reset default admin'}
          </Button>

          <p className="text-xs text-center text-slate-500">
            Or run: <span className="font-mono">node scripts/bootstrap-admin.mjs</span>
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
