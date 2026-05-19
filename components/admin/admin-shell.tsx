'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { COLLEGE } from '@/lib/college-brand';
import { ADMIN_NAV_ITEMS } from '@/lib/admin-nav';
import { useAdminGate } from '@/lib/use-admin-gate';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { allowed, loading } = useAdminGate();

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase?.auth.signOut();
    router.push('/auth/role');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#1e3a5f] animate-pulse" />
          <span>Loading admin panel…</span>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  const isOverviewActive = pathname === '/admin' || pathname === '/admin/dashboard';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="app-portal-header">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/90 font-bold">
                {COLLEGE.rce} · Administration
              </p>
              <h1 className="text-xl font-bold text-white mt-1">{COLLEGE.shortName}</h1>
              <p className="text-sm text-slate-200/90">{COLLEGE.departmentTitle}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/auth/role">
                <Button
                  variant="ghost"
                  className="border border-white/30 bg-white/10 !text-white hover:bg-white/20 hover:!text-white backdrop-blur"
                >
                  Portal home
                </Button>
              </Link>
              <Button
                type="button"
                variant="ghost"
                className="border border-white/30 bg-white/10 !text-white hover:bg-white/20 hover:!text-white backdrop-blur"
                onClick={signOut}
              >
                Sign out
              </Button>
            </div>
          </div>
          <nav className="mt-5 flex flex-wrap gap-1.5">
            {ADMIN_NAV_ITEMS.map((item) => {
              const active =
                item.href === '/admin/dashboard'
                  ? isOverviewActive
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.description}
                  className="app-portal-nav-link"
                  data-active={active}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
