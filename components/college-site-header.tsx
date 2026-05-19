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
    <header className="portal-auth sticky top-0 z-[100] border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:gap-4 sm:py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 sm:gap-3 transition-opacity hover:opacity-90"
          aria-label={`${COLLEGE.rce} — ${COLLEGE.shortName} home`}
        >
          <CollegeLogo size={42} className="sm:w-11 sm:h-11" />
          <span className="hidden sm:flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#1e3a5f] to-[#0c2340] text-sm font-extrabold text-white shadow-sm ring-1 ring-white/10">
            {COLLEGE.rce}
          </span>
        </Link>

        <Link href="/" className="min-w-0 flex-1 text-left transition-opacity hover:opacity-90">
          <p className="text-sm sm:text-base md:text-lg font-extrabold uppercase tracking-tight text-[#1e3a5f] leading-tight truncate">
            {COLLEGE.name}
          </p>
          <p className="mt-0.5 text-[11px] sm:text-xs md:text-sm font-medium text-slate-600 leading-snug truncate">
            {COLLEGE.departmentTitle}
          </p>
        </Link>
      </div>
    </header>
  );
}
