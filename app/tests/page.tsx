import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { PRACTICE_HUB_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Practice Tests — RCE',
  description: 'Practice psychometric, SWARX, AI interview, and competitive exam modules',
};

const accentStyles = {
  default: 'border-slate-200 bg-white hover:border-[#1e3a5f]/30 hover:shadow-md',
  blue: 'border-[#1e3a5f]/25 bg-white hover:border-[#1e3a5f]/40 hover:shadow-md ring-1 ring-[#1e3a5f]/10',
  emerald:
    'border-emerald-200 bg-white hover:border-emerald-300 hover:shadow-md ring-1 ring-emerald-100',
} as const;

export default function TestsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="app-page-header">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0c2340] mb-3">Practice Tests</h1>
          <p className="text-slate-700 text-lg font-medium max-w-3xl">
            Psychometric, SWARX communication, AI interview, and the All India competitive MCQ
            paper — single portal access.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-2 gap-6">
          {PRACTICE_HUB_ITEMS.map((item) => (
            <Link key={item.id} href={item.href}>
              <Card
                className={cn(
                  'group h-full p-6 transition-all duration-200 cursor-pointer hover:-translate-y-0.5',
                  accentStyles[item.accent],
                )}
              >
                {item.badge ? (
                  <div
                    className={cn(
                      'mb-3 inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider',
                      item.accent === 'emerald' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
                      item.accent === 'blue' &&
                        'border-[#1e3a5f]/20 bg-[#1e3a5f]/5 text-[#1e3a5f]',
                    )}
                  >
                    {item.badge}
                  </div>
                ) : null}
                <div className="text-4xl mb-4">{item.icon}</div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">{item.name}</h2>
                <p className="text-sm leading-relaxed text-slate-700 font-medium">{item.description}</p>
                <div className="mt-4 text-sm font-semibold text-[#1e3a5f] group-hover:underline">
                  {item.accent === 'emerald'
                    ? 'Enter examination hall →'
                    : item.accent === 'blue'
                      ? 'Start AI interview →'
                      : 'Start Practicing →'}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
