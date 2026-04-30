'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function GlobalBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (!pathname || pathname === '/') return null;

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="fixed top-4 left-4 z-[100] rounded-md border border-gray-300 bg-white/95 px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
      aria-label="Go back"
    >
      ← Back
    </button>
  );
}
