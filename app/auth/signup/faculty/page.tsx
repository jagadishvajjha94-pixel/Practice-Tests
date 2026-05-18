'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PortalShell } from '@/components/auth/portal-shell';
import { AuthCard } from '@/components/auth/auth-card';
import { FormField, portalInputClass } from '@/components/auth/form-field';
import {
  facultyAuthEmail,
  validateEmployeeId,
  validatePassword,
} from '@/lib/college-auth';
import { collegeEmailDomainHint } from '@/lib/college-signup';
import { useCollegeSignUp } from '@/components/auth/use-college-sign-up';
import { isSupabasePublicEnvConfigured, SUPABASE_PUBLIC_ENV_MESSAGE } from '@/lib/supabase-public-env';

function FacultySignupForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const postSignup =
    redirect && redirect.startsWith('/') && !redirect.startsWith('//')
      ? redirect
      : '/admin/tests';

  const { signUp, loading, error, setError } = useCollegeSignUp();
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const signupQuery = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required';
    const idErr = validateEmployeeId(employeeId);
    const passErr = validatePassword(password);
    if (idErr) errs.employeeId = idErr;
    if (passErr) errs.password = passErr;
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    if (!isSupabasePublicEnvConfigured()) {
      setError(SUPABASE_PUBLIC_ENV_MESSAGE);
      return;
    }

    await signUp({
      email: facultyAuthEmail(employeeId),
      password,
      fullName: fullName.trim(),
      role: 'faculty',
      redirectTo: postSignup,
      metadata: {
        employee_id: employeeId.trim(),
        full_name: fullName.trim(),
      },
    });
  };

  return (
    <PortalShell showBackToRoles backHref="/auth/signup" backLabel="← Back to registration">
      <AuthCard
        title="Faculty Registration"
        description={`Create your faculty account (@${collegeEmailDomainHint('faculty')}).`}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          {error ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
              {error}
            </p>
          ) : null}

          <FormField id="fullName" label="Full name" error={fieldErrors.fullName}>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={portalInputClass}
              required
            />
          </FormField>

          <FormField id="employeeId" label="Employee ID" error={fieldErrors.employeeId}>
            <Input
              id="employeeId"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. FAC1001"
              className={portalInputClass}
              autoComplete="username"
              required
            />
          </FormField>

          <FormField id="password" label="Password" error={fieldErrors.password}>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={portalInputClass}
              autoComplete="new-password"
              required
            />
          </FormField>

          <FormField id="confirmPassword" label="Confirm password" error={fieldErrors.confirmPassword}>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={portalInputClass}
              autoComplete="new-password"
              required
            />
          </FormField>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1e3a5f] hover:bg-[#16304f] text-white"
          >
            {loading ? 'Creating account…' : 'Create faculty account'}
          </Button>

          <p className="text-center text-sm text-slate-700">
            Already registered?{' '}
            <Link href={`/auth/login/faculty${signupQuery}`} className="font-semibold text-[#1e3a5f] hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </AuthCard>
    </PortalShell>
  );
}

export default function FacultySignupPage() {
  return (
    <Suspense
      fallback={
        <div className="portal-auth min-h-screen flex items-center justify-center text-slate-700 font-medium">
          Loading…
        </div>
      }
    >
      <FacultySignupForm />
    </Suspense>
  );
}
