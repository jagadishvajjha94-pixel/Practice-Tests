'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { COLLEGE } from '@/lib/college-brand';
import { ADMIN_NAV_ITEMS } from '@/lib/admin-nav';
import { useAdminGate } from '@/lib/use-admin-gate';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { cn } from '@/lib/utils';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">
        Loading admin panel…
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  const isOverviewActive = pathname === '/admin' || pathname === '/admin/dashboard';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0c2340] text-white border-b border-[#1e3a5f] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-300">{COLLEGE.rce} Admin</p>
              <h1 className="text-lg font-bold text-white">{COLLEGE.shortName}</h1>
              <p className="text-sm text-slate-300">{COLLEGE.departmentTitle}</p>
            </div>
            <div className="flex gap-2">
              <Link href="/auth/role">
                <Button
                  variant="ghost"
                  className="border border-white/50 bg-white/10 !text-white hover:bg-white/20 hover:!text-white"
                >
                  Portal home
                </Button>
              </Link>
              <Button
                type="button"
                variant="ghost"
                className="border border-white/50 bg-white/10 !text-white hover:bg-white/20 hover:!text-white"
                onClick={signOut}
              >
                Sign out
              </Button>
            </div>
          </div>
          <nav className="mt-4 flex flex-wrap gap-2">
            {ADMIN_NAV_ITEMS.map((item) => {
              const active =
                item.href === '/admin/dashboard'
                  ? isOverviewActive
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} title={item.description}>
                  <span
                    className={cn(
                      'inline-flex rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                      active ? 'bg-white text-[#0c2340]' : 'text-slate-200 hover:bg-white/10',
                    )}
                  >
                    {item.label}
                  </span>
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
