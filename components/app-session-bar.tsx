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
      className="pointer-events-auto fixed top-3 right-3 z-[9999] flex max-w-[min(100vw-1.5rem,20rem)] flex-wrap items-center justify-end gap-2 rounded-xl border border-white/20 bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur-xl sm:top-4 sm:right-4 sm:text-sm"
      role="region"
      aria-label="Account"
    >
      <span className="truncate text-muted-foreground" title={email}>
        {email}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button variant="ghost" size="sm" className="h-8 px-2 text-foreground" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-foreground" asChild>
          <Link href="/profile">Profile</Link>
        </Button>
        <Button variant="outline" size="sm" className="h-8 border-white/30 bg-white/10" onClick={() => void handleLogout()}>
          Log out
        </Button>
      </div>
    </div>
  );

  return createPortal(bar, document.body);
}
