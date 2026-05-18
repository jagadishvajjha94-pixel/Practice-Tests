'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PortalShell } from '@/components/auth/portal-shell';
import { AuthCard } from '@/components/auth/auth-card';
import {
  facultyAuthEmail,
  validateEmployeeId,
  validatePassword,
} from '@/lib/college-auth';
import { useCollegeSignIn } from '@/components/auth/use-college-sign-in';
import { isSupabasePublicEnvConfigured, SUPABASE_PUBLIC_ENV_MESSAGE } from '@/lib/supabase-public-env';

function FacultyLoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const postLogin =
    redirect && redirect.startsWith('/') && !redirect.startsWith('//')
      ? redirect
      : '/admin/tests';

  const { signIn, loading, error, setError } = useCollegeSignIn();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errs: Record<string, string> = {};
    const idErr = validateEmployeeId(employeeId);
    const passErr = validatePassword(password);
    if (idErr) errs.employeeId = idErr;
    if (passErr) errs.password = passErr;
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    if (!isSupabasePublicEnvConfigured()) {
      setError(SUPABASE_PUBLIC_ENV_MESSAGE);
      return;
    }

    await signIn({
      email: facultyAuthEmail(employeeId),
      password,
      redirectTo: postLogin,
      metadata: {
        role: 'faculty',
        employee_id: employeeId.trim(),
      },
    });
  };

  return (
    <PortalShell showBackToRoles>
      <AuthCard
        title="Faculty Sign In"
        description="Use your employee ID and password."
      >
        <form onSubmit={onSubmit} className="space-y-4 text-left">
          {error ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          ) : null}

          <div>
            <label htmlFor="employeeId" className="block text-sm font-medium text-slate-700 mb-1">
              Employee ID
            </label>
            <Input
              id="employeeId"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. FAC1024"
              className="bg-white border-slate-300"
              autoComplete="username"
              required
            />
            {fieldErrors.employeeId ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.employeeId}</p>
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

          <div className="text-right">
            <Link href="/auth/forgot-password" className="text-sm text-[#1e3a5f] hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1e3a5f] hover:bg-[#16304f] text-white"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </AuthCard>
    </PortalShell>
  );
}

export default function FacultyLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="portal-auth min-h-screen flex items-center justify-center text-slate-700 font-medium">
          Loading…
        </div>
      }
    >
      <FacultyLoginForm />
    </Suspense>
  );
}
