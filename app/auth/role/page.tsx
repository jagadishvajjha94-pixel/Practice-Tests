import Link from 'next/link';
import { GraduationCap, Shield } from 'lucide-react';
import { PortalShell } from '@/components/auth/portal-shell';
import { AuthFlowPanel } from '@/components/auth/auth-flow-panel';
import { RoleCard } from '@/components/auth/role-card';
import { COLLEGE } from '@/lib/college-brand';
import { isSignupDisabled } from '@/lib/auth-features';

type Props = {
  searchParams: Promise<{ redirect?: string; notice?: string }>;
};

export const metadata = {
  title: `Sign in — ${COLLEGE.departmentTitle}`,
};

export default async function RoleSelectionPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = new URLSearchParams();
  if (params.redirect) q.set('redirect', params.redirect);
  if (params.notice) q.set('notice', params.notice);
  const suffix = q.toString() ? `?${q.toString()}` : '';
  const signupOpen = !isSignupDisabled();

  return (
    <PortalShell>
      <AuthFlowPanel title="Sign in" subtitle="Select your role to continue">
        {params.notice === 'signup_closed' ? (
          <p className="mb-4 text-sm font-medium text-amber-950 bg-amber-50 border border-amber-300/60 rounded-lg px-4 py-3">
            New registrations are closed. Sign in with credentials issued by your department.
          </p>
        ) : null}
        <div className="space-y-3">
          <RoleCard
            href={`/auth/login/student${suffix}`}
            title="Student Login"
            description="Roll number, password, department and year"
            icon={GraduationCap}
          />
          <RoleCard
            href={`/auth/login/admin${suffix}`}
            title="Admin Login"
            description="Examination cell — create exams, slots, and go live"
            icon={Shield}
          />
        </div>
        {signupOpen ? (
          <p className="mt-6 text-center text-sm text-slate-700 border-t border-slate-200 pt-5">
            New to the portal?{' '}
            <Link href={`/auth/signup/student${suffix}`} className="font-semibold text-[#1e3a5f] hover:underline">
              Create student account
            </Link>
          </p>
        ) : null}
      </AuthFlowPanel>
    </PortalShell>
  );
}
