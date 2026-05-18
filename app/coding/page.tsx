import Link from 'next/link';
import { ProgrammingTestPanel } from '@/components/coding/programming-test-panel';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Coding Lab — RCE',
  description: 'Monaco editor with 7 programming languages',
};

export default function CodingLabPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="app-page-header shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#1e4a7a] font-semibold">Coding Lab</p>
            <h1 className="text-xl font-bold text-[#0c2340]">Open playground</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/tests/programming">Programming test →</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/tests">← Practice tests</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-4">
        <ProgrammingTestPanel showProblemList={false} />
      </div>
    </div>
  );
}
