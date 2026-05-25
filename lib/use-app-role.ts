'use client';

import { useEffect, useState } from 'react';
import { getBrowserAuthUser } from '@/lib/supabase-browser';
import type { AppRole } from '@/lib/roles';

export function useAppRole() {
  const [role, setRole] = useState<AppRole | 'loading'>('loading');

  useEffect(() => {
    const run = async () => {
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
