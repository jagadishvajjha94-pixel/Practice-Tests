import Link from 'next/link';
import { ProgrammingTestPanel } from '@/components/coding/programming-test-panel';
import { Button } from '@/components/ui/button';
import { CODING_LANGUAGES } from '@/lib/coding/languages';

export const metadata = {
  title: 'Programming — Practice Tests | RCE',
  description:
    'Monaco code editor with Python, Java, C, C++, JavaScript, Go, and C# — compile and run programming questions.',
};

export default function ProgrammingTestPage() {
  const languageList = CODING_LANGUAGES.map((l) => l.label).join(', ');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="app-page-header shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#1e4a7a] font-semibold mb-1">
              Practice Tests · Programming
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0c2340]">Programming Test</h1>
            <p className="text-sm text-slate-700 mt-1 max-w-2xl">
              Write code in the Monaco editor, run against sample input, and verify output. Supports{' '}
              {languageList}.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/tests">← Back to practice tests</Link>
          </Button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <ProgrammingTestPanel showProblemList />
      </div>
    </div>
  );
}
