'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CollegeLogo } from '@/components/auth/college-logo';
import { COLLEGE } from '@/lib/college-brand';

/** RCE + college branding — all pages except landing (landing has its own hero). */
export default function CollegeSiteHeader() {
  const pathname = usePathname();

  if (pathname === '/' || pathname?.startsWith('/tests/programming') || pathname === '/coding') {
    return null;
  }

  return (
    <header className="portal-auth sticky top-0 z-[100] border-b border-[#1e3a5f]/15 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:gap-4 sm:py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 sm:gap-3"
          aria-label={`${COLLEGE.rce} — ${COLLEGE.shortName} home`}
        >
          <CollegeLogo size={42} className="sm:w-11 sm:h-11" />
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1e3a5f] text-sm font-extrabold text-white">
            {COLLEGE.rce}
          </span>
        </Link>

        <Link href="/" className="min-w-0 flex-1 text-left hover:opacity-90">
          <p className="text-sm sm:text-base md:text-lg font-extrabold uppercase tracking-wide text-[#1e3a5f] leading-tight">
            {COLLEGE.name}
          </p>
          <p className="mt-0.5 text-[11px] sm:text-xs md:text-sm font-semibold text-slate-700 leading-snug">
            {COLLEGE.departmentTitle}
          </p>
        </Link>
      </div>
    </header>
  );
}
