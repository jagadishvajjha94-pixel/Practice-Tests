'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentAnalyticsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/exams');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-600">Redirecting…</p>
    </div>
  );
}
