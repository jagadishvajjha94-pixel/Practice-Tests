'use client';

import { useEffect, useState } from 'react';
import { isAwsClientMode } from '@/lib/client-auth';
import { getBrowserAuthUser } from '@/lib/supabase-browser';
import type { AppRole } from '@/lib/roles';

export function useAppRole() {
  const [role, setRole] = useState<AppRole | 'loading'>('loading');

  useEffect(() => {
    const run = async () => {
      if (isAwsClientMode()) {
        try {
          const res = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' });
          if (!res.ok) {
            setRole('guest');
            return;
          }
          const json = (await res.json()) as { user?: { role?: string } };
          if (!json.user) {
            setRole('guest');
            return;
          }
          if (json.user.role === 'admin') {
            setRole('admin');
            return;
          }
          setRole('student');
        } catch {
          setRole('guest');
        }
        return;
      }

      const user = await getBrowserAuthUser();
      if (!user) {
        setRole('guest');
        return;
      }

      const meRes = await fetch('/api/admin/me');
      if (meRes.ok) {
        const me = (await meRes.json()) as { isAdmin?: boolean };
        if (me.isAdmin) {
          setRole('admin');
          return;
        }
      }

      setRole('student');
    };
    void run();
  }, []);

  return role;
}
