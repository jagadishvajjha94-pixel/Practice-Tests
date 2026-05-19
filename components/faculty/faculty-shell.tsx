'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { COLLEGE } from '@/lib/college-brand';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const navItems = [
  { href: '/faculty/dashboard', label: 'Overview' },
  { href: '/faculty/upload', label: 'Upload exam' },
  { href: '/faculty/performance', label: 'Student performance' },
] as const;

export function FacultyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [department, setDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login/faculty');
        return;
      }

      const metaRole = String(user.user_metadata?.role ?? '');
      if (metaRole !== 'faculty') {
        const { data: adminRow } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (adminRow) {
          router.replace('/admin/dashboard');
          return;
        }
        router.replace('/dashboard');
        return;
      }

      const res = await fetch('/api/faculty/profile');
      if (res.ok) {
        const json = (await res.json()) as { department?: string };
        setDepartment(json.department ?? null);
      }
      setLoading(false);
    };
    void init();
  }, [router]);

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase?.auth.signOut();
    router.push('/auth/role');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#1e3a5f] animate-pulse" />
          <span>Loading faculty portal…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="app-portal-header">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/90 font-bold">
              {COLLEGE.rce} · Faculty
            </p>
            <h1 className="text-lg sm:text-xl font-bold text-white mt-1 leading-tight">
              {COLLEGE.name}
            </h1>
            <p className="text-sm text-slate-200/90">{COLLEGE.departmentTitle}</p>
            {department ? (
              <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur px-2.5 py-0.5 text-xs font-semibold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {department}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="shrink-0 border border-white/30 bg-white/10 !text-white hover:bg-white/20 hover:!text-white backdrop-blur"
            onClick={signOut}
          >
            Sign out
          </Button>
        </div>
        <nav className="max-w-6xl mx-auto px-4 pb-4 flex flex-wrap gap-1.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="app-portal-nav-link"
              data-active={pathname === item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
