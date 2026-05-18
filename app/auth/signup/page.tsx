import { GraduationCap, Users } from 'lucide-react';
import Link from 'next/link';
import { PortalShell } from '@/components/auth/portal-shell';
import { AuthFlowPanel } from '@/components/auth/auth-flow-panel';
import { RoleCard } from '@/components/auth/role-card';
import { COLLEGE } from '@/lib/college-brand';
import { isSignupDisabled } from '@/lib/auth-features';

type Props = {
  searchParams: Promise<{ redirect?: string }>;
};

export const metadata = {
  title: `Create account — ${COLLEGE.departmentTitle}`,
};

export default async function SignupRolePage({ searchParams }: Props) {
  const params = await searchParams;
  const q = new URLSearchParams();
  if (params.redirect) q.set('redirect', params.redirect);
  const suffix = q.toString() ? `?${q.toString()}` : '';

  if (isSignupDisabled()) {
    return (
      <PortalShell>
        <AuthFlowPanel title="Registration closed" subtitle="New accounts are not accepted during the exam period.">
          <p className="text-sm text-slate-700 mb-4">
            Please sign in with credentials issued by the Training &amp; Placement Department.
          </p>
          <Link
            href={`/auth/role${suffix}`}
            className="inline-flex w-full items-center justify-center rounded-lg bg-[#1e3a5f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#16304f]"
          >
            Go to sign in
          </Link>
        </AuthFlowPanel>
      </PortalShell>
    );
  }

  return (
    <PortalShell>
      <AuthFlowPanel
        title="Create account"
        subtitle="Students and faculty can register. Admin access is issued by the examination cell only."
      >
        <div className="space-y-3">
          <RoleCard
            href={`/auth/signup/student${suffix}`}
            title="Student registration"
            description="Roll number, department, year, and password"
            icon={GraduationCap}
          />
          <RoleCard
            href={`/auth/signup/faculty${suffix}`}
            title="Faculty registration"
            description="Employee ID and password"
            icon={Users}
          />
        </div>
        <p className="mt-6 text-center text-sm text-slate-700">
          Already registered?{' '}
          <Link href={`/auth/role${suffix}`} className="font-semibold text-[#1e3a5f] hover:underline">
            Sign in
          </Link>
        </p>
      </AuthFlowPanel>
    </PortalShell>
  );
}
