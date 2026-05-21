'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CollegeLogo } from '@/components/auth/college-logo';
import { COLLEGE } from '@/lib/college-brand';
import { isExamFocusRoute } from '@/lib/exam-routes';
import { defaultRedirectForRole, type AppRole } from '@/lib/roles';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

function homeHrefForRole(role: AppRole | null): string {
  if (!role || role === 'guest') return '/';
  return defaultRedirectForRole(role);
}

/** Persistent RCE blue brand bar — visible on every page except active exam-taking. */
export default function CollegeSiteHeader() {
  const pathname = usePathname();
  const [homeHref, setHomeHref] = useState('/');

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setHomeHref('/');
      return undefined;
    }

    const sync = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setHomeHref('/');
        return;
      }
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const metaRole = String(meta.role ?? '').toLowerCase();
      let role: AppRole = 'student';
      if (metaRole === 'admin') role = 'admin';
      else if (metaRole === 'faculty') role = 'faculty';
      setHomeHref(homeHrefForRole(role));
    };

    void sync();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void sync();
    });
    return () => subscription.unsubscribe();
  }, []);

  if (isExamFocusRoute(pathname)) {
    return null;
  }

  const isPortalRoute =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/faculty') ||
    pathname?.startsWith('/auth');

  return (
    <header className="app-brand-bar relative sticky top-0 z-[100]">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:gap-4 sm:py-3">
        <Link
          href={homeHref}
          className="flex shrink-0 items-center gap-2.5 sm:gap-3 transition-opacity hover:opacity-90"
          aria-label={`${COLLEGE.rce} — ${COLLEGE.shortName} portal home`}
        >
          <span className="rounded-lg bg-white/95 p-0.5 shadow-sm ring-1 ring-white/30">
            <CollegeLogo size={isPortalRoute ? 36 : 40} className="sm:w-10 sm:h-10" />
          </span>
          <span className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-xs font-extrabold text-white ring-1 ring-white/25 backdrop-blur-sm">
            {COLLEGE.rce}
          </span>
        </Link>

        <Link
          href={homeHref}
          className="min-w-0 flex-1 text-left transition-opacity hover:opacity-90"
        >
          <p className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-white leading-tight truncate font-[family-name:var(--font-display),ui-serif,Georgia,serif]">
            {COLLEGE.name}
          </p>
          <p className="brand-subtitle mt-0.5 text-[11px] sm:text-xs font-medium leading-snug truncate tracking-wide">
            {COLLEGE.departmentTitle}
          </p>
        </Link>
      </div>
    </header>
  );
}
