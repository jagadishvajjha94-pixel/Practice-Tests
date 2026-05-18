import { GraduationCap, Shield, Users } from 'lucide-react';
import { PortalShell } from '@/components/auth/portal-shell';
import { AuthFlowPanel } from '@/components/auth/auth-flow-panel';
import { RoleCard } from '@/components/auth/role-card';
import { COLLEGE } from '@/lib/college-brand';

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

  return (
    <PortalShell>
      <AuthFlowPanel title="Sign in" subtitle="Select your role to continue">
        <div className="space-y-3">
          <RoleCard
            href={`/auth/login/student${suffix}`}
            title="Student Login"
            description="Roll number, password, department and year"
            icon={GraduationCap}
          />
          <RoleCard
            href={`/auth/login/faculty${suffix}`}
            title="Faculty Login"
            description="Employee ID and password"
            icon={Users}
          />
          <RoleCard
            href={`/auth/login/admin${suffix}`}
            title="Admin Login"
            description="Examination cell and system administrators"
            icon={Shield}
          />
        </div>
      </AuthFlowPanel>
    </PortalShell>
  );
}
