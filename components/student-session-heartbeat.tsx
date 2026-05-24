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

    ping();
    const timer = setInterval(ping, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [active]);

  return null;
}
