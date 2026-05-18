'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/** Redirects non-admins away from /admin pages. */
export function useAdminGate() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const res = await fetch('/api/admin/me');
      const json = (await res.json()) as { isAdmin?: boolean; authenticated?: boolean };
      if (!json.isAdmin) {
        router.replace(json.authenticated ? '/dashboard' : '/auth/login/admin');
        return;
      }
      setAllowed(true);
      setLoading(false);
    };
    void run();
  }, [router]);

  return { allowed, loading };
}
