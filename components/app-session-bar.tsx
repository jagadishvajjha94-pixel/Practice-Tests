'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { isExamFocusRoute } from '@/lib/exam-routes';

export default function AppSessionBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setEmail(null);
      return undefined;
    }

    const refresh = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
    };

    void refresh();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!mounted) return null;
  if (email === undefined) return null;
  if (!email) return null;
  if (isExamFocusRoute(pathname)) return null;
  if (pathname === '/' || pathname?.startsWith('/auth')) return null;
  // Account shortcuts only on student dashboard (not on every page).
  if (pathname !== '/dashboard') return null;

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setEmail(null);
    router.push('/');
    router.refresh();
  };

  const bar = (
    <div
      className="pointer-events-auto fixed top-[4.25rem] right-3 z-[9999] flex max-w-[min(100vw-1.5rem,22rem)] flex-wrap items-center justify-end gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md sm:right-4 sm:text-sm"
      role="region"
      aria-label="Account"
    >
      <span className="truncate font-medium text-slate-700" title={email}>
        {email}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button variant="ghost" size="sm" className="h-8 px-2 text-[#1e3a5f]" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-[#1e3a5f]" asChild>
          <Link href="/profile">Profile</Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-slate-300 text-slate-800 hover:bg-slate-50"
          onClick={() => void handleLogout()}
        >
          Log out
        </Button>
      </div>
    </div>
  );

  return createPortal(bar, document.body);
}
