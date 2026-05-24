'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

/** Student dashboard removed — route students to live examinations only. */
export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
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
        router.replace('/faculty/dashboard');
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
