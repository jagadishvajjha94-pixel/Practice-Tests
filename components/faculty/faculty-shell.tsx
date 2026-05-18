'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { COLLEGE } from '@/lib/college-brand';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { cn } from '@/lib/utils';

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
        Loading faculty portal…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#0c2340] text-white border-b border-[#1e3a5f]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-300">{COLLEGE.rce} Faculty</p>
            <h1 className="text-lg font-bold">{COLLEGE.shortName}</h1>
            {department ? <p className="text-sm text-slate-300 mt-0.5">{department}</p> : null}
          </div>
          <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={signOut}>
            Sign out
          </Button>
        </div>
        <nav className="max-w-6xl mx-auto px-4 pb-3 flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                pathname === item.href ? 'bg-white text-[#0c2340]' : 'text-slate-200 hover:bg-white/10',
              )}
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
