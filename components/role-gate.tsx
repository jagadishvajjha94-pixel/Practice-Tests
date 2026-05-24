'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { defaultRedirectForRole } from '@/lib/roles';
import { useAppRole } from '@/lib/use-app-role';

type RoleGateProps = {
  children: React.ReactNode;
  allow?: Array<'student' | 'admin' | 'guest'>;
};

/** Blocks admin from student exam UI when allow is student-only. */
export function RoleGate({ children, allow = ['student', 'guest'] }: RoleGateProps) {
  const role = useAppRole();
  const router = useRouter();

  useEffect(() => {
    if (role === 'loading') return;
    if (role === 'admin') {
      router.replace(defaultRedirectForRole(role));
    }
  }, [role, router]);

  if (role === 'loading') {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-600">
        Checking access…
      </div>
    );
  }

  if (role === 'admin' && !allow.includes(role)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Student exams only</h2>
        <p className="text-slate-600 mb-6">
          Administrators use the admin portal. You cannot take practice tests from the student
          interface.
        </p>
        <Link href={defaultRedirectForRole(role)}>
          <Button className="bg-[#1e3a5f] hover:bg-[#16304f]">Go to your portal</Button>
        </Link>
      </div>
    );
  }

  if (!allow.includes(role as 'student' | 'guest')) {
    return null;
  }

  return <>{children}</>;
}
