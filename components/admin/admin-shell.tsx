'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { COLLEGE } from '@/lib/college-brand';
import { ADMIN_NAV_ITEMS } from '@/lib/admin-nav';
import { useAdminGate } from '@/lib/use-admin-gate';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { LoadingScreen } from '@/components/ui/loading-screen';

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
    return <LoadingScreen message="Loading admin panel…" className="min-h-screen app-portal-shell" />;
  }

  if (!allowed) {
    return null;
  }

  const isOverviewActive = pathname === '/admin' || pathname === '/admin/dashboard';

  return (
    <div className="app-portal-shell">
      <header className="app-portal-header relative">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.2em] text-amber-200/90 font-bold">
                {COLLEGE.rce} · Administration
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-white mt-1 tracking-tight font-[family-name:var(--font-display),ui-serif,Georgia,serif]">
                {COLLEGE.shortName}
              </h1>
              <p className="text-sm text-slate-200/90 mt-0.5">{COLLEGE.departmentTitle}</p>
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
      <main className="app-portal-main">{children}</main>
    </div>
  );
}
