'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { AppRole } from '@/lib/roles';

export function useAppRole() {
  const [role, setRole] = useState<AppRole | 'loading'>('loading');

  useEffect(() => {
    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setRole('guest');
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRole('guest');
        return;
      }

      const { data: adminRow } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (adminRow) {
        setRole('admin');
        return;
      }

      if (String(user.user_metadata?.role ?? '') === 'faculty') {
        setRole('faculty');
        return;
      }

      setRole('student');
    };
    void run();
  }, []);

  return role;
}
