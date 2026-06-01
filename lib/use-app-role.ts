'use client';

import { useEffect, useState } from 'react';
import { getClientUser } from '@/lib/client-auth';
import type { AppRole } from '@/lib/roles';

export function useAppRole() {
  const [role, setRole] = useState<AppRole | 'loading'>('loading');

  useEffect(() => {
    const run = async () => {
      try {
        const user = await getClientUser();
        if (!user) {
          setRole('guest');
          return;
        }
        if (user.role === 'admin') {
          setRole('admin');
          return;
        }
        const meRes = await fetch('/api/admin/me', { credentials: 'include', cache: 'no-store' });
        if (meRes.ok) {
          const me = (await meRes.json()) as { isAdmin?: boolean };
          if (me.isAdmin) {
            setRole('admin');
            return;
          }
        }
        setRole('student');
      } catch {
        setRole('guest');
      }
    };
    void run();
  }, []);

  return role;
}
