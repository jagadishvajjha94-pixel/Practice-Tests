'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getClientUser, isAwsClientMode } from '@/lib/client-auth';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

/** Student dashboard removed — route students to live examinations only. */
export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      if (isAwsClientMode()) {
        const user = await getClientUser();
        if (!user) {
          router.replace('/auth/login/student');
          return;
        }
        const meRes = await fetch('/api/admin/me', { credentials: 'include' });
        if (meRes.ok) {
          const me = (await meRes.json()) as { isAdmin?: boolean };
          if (me.isAdmin) {
            router.replace('/admin/dashboard');
            return;
          }
        }
        router.replace('/exams');
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        router.replace('/exams');
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login/student');
        return;
      }
      const role = String(user.user_metadata?.role ?? '');
      if (role === 'admin') {
        router.replace('/admin/dashboard');
        return;
      }
      if (role === 'faculty') {
        router.replace('/auth/role');
        return;
      }
      const { data: adminRow } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (adminRow) {
        router.replace('/admin/dashboard');
        return;
      }
      router.replace('/exams');
    };
    void run();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-600">Opening examinations…</p>
    </div>
  );
}
