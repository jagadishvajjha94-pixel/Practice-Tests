'use client';

import { usePathname, useRouter } from 'next/navigation';
import { isExamFocusRoute } from '@/lib/exam-routes';

export default function GlobalBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (!pathname || pathname === '/' || isExamFocusRoute(pathname)) return null;

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[120] inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-xl backdrop-blur-2xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20"
      aria-label="Go back"
    >
      <span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">
        ←
      </span>
      <span>Back</span>
    </button>
  );
}
