'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

/** Keeps the one-login-per-roll lock alive while the student is using the app (including during exams). */
export function StudentSessionHeartbeat() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith('/auth')) {
      setActive(false);
      return undefined;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return undefined;

    let cancelled = false;

    const sync = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setActive(Boolean(user?.email?.includes('@student.')));
    };

    void sync();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void sync();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [pathname]);

  useEffect(() => {
    if (!active) return undefined;

    const ping = () => {
      void fetch('/api/auth/student/session-heartbeat', {
        method: 'POST',
        credentials: 'include',
      });
    };

    const onExamRoute =
      pathname?.startsWith('/placement') ||
      pathname?.startsWith('/tests/take') ||
      pathname?.startsWith('/exam/');
    const intervalMs = onExamRoute ? 60 * 1000 : 5 * 60 * 1000;

    ping();
    const timer = setInterval(ping, intervalMs);
    return () => clearInterval(timer);
  }, [active, pathname]);

  return null;
}
