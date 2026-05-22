'use client';

import { Suspense } from 'react';
import { TestReportsDashboard } from '@/components/admin/test-reports-dashboard';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function AdminTestReportsPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading test reports…" className="min-h-[50vh]" />}>
      <TestReportsDashboard />
    </Suspense>
  );
}
