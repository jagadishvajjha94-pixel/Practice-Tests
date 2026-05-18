'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PortalShell } from '@/components/auth/portal-shell';
import { AuthCard } from '@/components/auth/auth-card';
import {
  FormField,
  portalInputClass,
  portalSelectContentClass,
  portalSelectItemClass,
  portalSelectTriggerClass,
} from '@/components/auth/form-field';
import { ACADEMIC_YEARS, DEPARTMENTS } from '@/lib/college-brand';
import {
  studentAuthEmail,
  validatePassword,
  validateRollNumber,
} from '@/lib/college-auth';
import { useCollegeSignIn } from '@/components/auth/use-college-sign-in';
import { isSupabasePublicEnvConfigured, SUPABASE_PUBLIC_ENV_MESSAGE } from '@/lib/supabase-public-env';
import { isSignupDisabled } from '@/lib/auth-features';

const REMEMBER_KEY = 'rce_student_remember';

function StudentLoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const notice = searchParams.get('notice');
  const postLogin =
    redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard';

  const signupOpen = !isSignupDisabled();
  const signupHref = redirect
    ? `/auth/signup/student?redirect=${encodeURIComponent(redirect)}`
    : '/auth/signup/student';

  const { signIn, loading, error, setError } = useCollegeSignIn();
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [remember, setRemember] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setRollNumber(saved);
        setRemember(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errs: Record<string, string> = {};
    const rollErr = validateRollNumber(rollNumber);
    const passErr = validatePassword(password);
    if (rollErr) errs.rollNumber = rollErr;
    if (passErr) errs.password = passErr;
    if (!department) errs.department = 'Select your department';
    if (!year) errs.year = 'Select your year';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    if (!isSupabasePublicEnvConfigured()) {
      setError(SUPABASE_PUBLIC_ENV_MESSAGE);
      return;
    }

    if (remember) {
      localStorage.setItem(REMEMBER_KEY, rollNumber.trim());
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    const email = studentAuthEmail(rollNumber);
    await signIn({
      email,
      password,
      redirectTo: postLogin,
      metadata: {
        role: 'student',
        roll_number: rollNumber.trim(),
        department,
        year,
        full_name: rollNumber.trim(),
      },
    });
  };

  return (
    <PortalShell showBackToRoles>
      <AuthCard
        title="Student Sign In"
        description="Use your roll number and password provided by the examination cell."
      >
        <form onSubmit={onSubmit} className="space-y-5">
          {notice === 'signup_closed' ? (
            <p className="text-sm font-medium text-amber-950 bg-amber-50 border border-amber-300/60 rounded-lg px-4 py-3">
              New registrations are closed. Sign in with credentials issued by your department.
            </p>
          ) : null}

          {error ? (
            <p
              className="text-sm font-medium text-red-950 bg-red-50 border border-red-200 rounded-lg px-4 py-3"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <FormField
            id="rollNumber"
            label="Roll Number / Registration Number"
            hint="As printed on your college ID card"
            error={fieldErrors.rollNumber}
          >
            <Input
              id="rollNumber"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. 21CS001"
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
              placeholder="Enter your password"
              className={portalInputClass}
              autoComplete="current-password"
              required
            />
          </FormField>

          <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 sm:p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1e3a5f]">
              Academic details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <FormField label="Department" error={fieldErrors.department}>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className={portalSelectTriggerClass}>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className={portalSelectContentClass}>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d} className={portalSelectItemClass}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Year" error={fieldErrors.year}>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className={portalSelectTriggerClass}>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className={portalSelectContentClass}>
                    {ACADEMIC_YEARS.map((y) => (
                      <SelectItem key={y} value={y} className={portalSelectItemClass}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-0.5">
            <label className="flex items-center gap-2.5 text-sm font-medium text-slate-800 cursor-pointer select-none">
              <Checkbox
                checked={remember}
                onCheckedChange={(v) => setRemember(v === true)}
                className="border-slate-400 data-[state=checked]:bg-[#1e3a5f] data-[state=checked]:border-[#1e3a5f]"
              />
              Remember roll number
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-sm font-semibold text-[#1e4a7a] hover:text-[#1e3a5f] hover:underline text-center sm:text-right"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-base font-semibold rounded-lg bg-[#1e3a5f] hover:bg-[#16304f] text-white shadow-md shadow-[#1e3a5f]/25 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in to portal'}
          </Button>

          {signupOpen ? (
            <p className="text-center text-sm text-slate-700 pt-1">
              New student?{' '}
              <Link href={signupHref} className="font-semibold text-[#1e3a5f] hover:underline">
                Create account
              </Link>
            </p>
          ) : null}
        </form>
      </AuthCard>
    </PortalShell>
  );
}

export default function StudentLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="portal-auth min-h-screen flex items-center justify-center text-slate-800 font-medium">
          Loading…
        </div>
      }
    >
      <StudentLoginForm />
    </Suspense>
  );
}
