'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COLLEGE } from '@/lib/college-brand';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/faculty/dashboard', label: 'Overview' },
  { href: '/faculty/upload', label: 'Create exam' },
  { href: '/faculty/performance', label: 'Student performance' },
  { href: '/faculty/proctoring', label: 'Proctoring' },
] as const;

export function FacultyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [department, setDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

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
        router.replace('/home');
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

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  if (loading) {
    return <LoadingScreen message="Loading faculty portal…" className="min-h-screen app-portal-shell" />;
  }

  return (
    <div className="app-portal-shell">
      <header className="app-portal-header relative">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 border border-white/30 bg-white/15 !text-white hover:bg-white/25"
              aria-expanded={navOpen}
              aria-controls="faculty-nav-drawer"
              aria-label={navOpen ? 'Close faculty menu' : 'Open faculty menu'}
              onClick={() => setNavOpen((o) => !o)}
            >
              {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.18em] text-amber-200/90 font-bold truncate">
                {COLLEGE.rce} · Faculty
              </p>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight font-[family-name:var(--font-display),ui-serif,Georgia,serif] truncate">
                {COLLEGE.shortName}
              </h1>
              {department ? (
                <p className="text-[11px] text-slate-200/90 truncate mt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shrink-0" />
                    {department}
                  </span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-200/80 truncate mt-0.5">{COLLEGE.departmentTitle}</p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 hidden sm:inline-flex border border-white/30 bg-white/10 !text-white hover:bg-white/20 h-8 text-xs"
              onClick={signOut}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {navOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[95] bg-black/40 backdrop-blur-[1px]"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <aside
        id="faculty-nav-drawer"
        className={cn(
          'fixed top-0 left-0 z-[100] h-full w-[min(100vw-2.5rem,320px)] bg-[#0c2340] text-white shadow-2xl transition-transform duration-200 ease-out flex flex-col',
          navOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none',
        )}
        aria-hidden={!navOpen}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p className="text-sm font-bold tracking-tight">Faculty menu</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/10"
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-white text-[#0c2340] shadow-sm'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white',
                )}
                onClick={() => setNavOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3 flex flex-col gap-2 sm:hidden">
          <Button type="button" variant="outline" className="w-full border-white/30 text-white" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </aside>

      <main className="app-portal-main">{children}</main>
    </div>
  );
}
