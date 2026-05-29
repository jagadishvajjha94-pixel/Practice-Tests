'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getClientUser, isAwsClientMode } from '@/lib/client-auth';
import { getBrowserAuthUser, getSupabaseBrowserClient } from '@/lib/supabase-browser';

/** Keeps the one-login-per-roll lock alive while the student is using the app (including during exams). */
export function StudentSessionHeartbeat() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith('/auth')) {
      setActive(false);
      return undefined;
    }

    let cancelled = false;

    const sync = async () => {
      const user = isAwsClientMode() ? await getClientUser() : await getBrowserAuthUser();
      if (cancelled) return;
      setActive(Boolean(user?.email?.includes('@student.') || user?.email?.includes('@')));
    };

    void sync();

    if (isAwsClientMode()) {
      return () => {
        cancelled = true;
      };
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return undefined;

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
