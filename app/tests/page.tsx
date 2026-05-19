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
  evalora: '', // Rendered with a fully custom layout below.
} as const;

export default function TestsPage() {
  const featured = PRACTICE_HUB_ITEMS.find((i) => 'featured' in i && i.featured);
  const others = PRACTICE_HUB_ITEMS.filter((i) => i !== featured);

  return (
    <div className="min-h-screen bg-background">
      <div className="app-page-header">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0c2340] mb-3">Practice Tests</h1>
          <p className="text-slate-700 text-lg font-medium max-w-3xl">
            Psychometric, SWARX, AI interview, competitive MCQ paper, and programming with a
            multi-language editor — single portal access.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        {featured ? (
          <Link href={featured.href} className="block group">
            <div className="relative overflow-hidden rounded-3xl shadow-2xl transition-transform duration-200 group-hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-600" />
              <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-pink-400/40 blur-3xl" aria-hidden />
              <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" aria-hidden />
              <div className="relative grid md:grid-cols-3 gap-8 p-8 sm:p-10 text-white">
                <div className="md:col-span-2 space-y-4">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    Featured · AI scored
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-5xl drop-shadow-sm" aria-hidden>
                      {featured.icon}
                    </span>
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-fuchsia-100 to-cyan-200 bg-clip-text text-transparent">
                      {featured.name}
                    </h2>
                  </div>
                  <p className="text-sm sm:text-base text-white/90 leading-relaxed max-w-2xl">
                    {featured.description}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(featured.badge ?? '').split('·').map((part) => (
                      <span
                        key={part}
                        className="inline-flex items-center rounded-full bg-white/15 backdrop-blur border border-white/25 px-3 py-1 text-xs font-semibold text-white"
                      >
                        {part.trim()}
                      </span>
                    ))}
                  </div>
                  <div className="pt-2 inline-flex items-center gap-2 text-base font-bold text-white">
                    {'cta' in featured && featured.cta ? featured.cta : 'Launch →'}
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </div>

                <ul className="space-y-2 self-center text-sm">
                  {[
                    'Technical · 35 marks',
                    'Speaking · 10 marks',
                    'Psychometric · 10 marks',
                    'Aptitude · 20 marks',
                    'Logic · 15 marks',
                    'Intelligence · 10 marks',
                  ].map((row) => (
                    <li
                      key={row}
                      className="flex items-center gap-2 rounded-lg bg-white/10 border border-white/15 backdrop-blur px-3 py-2 text-white"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      <span className="text-[13px] font-medium">{row}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Link>
        ) : null}

        <div className="grid md:grid-cols-2 gap-6">
          {others.map((item) => (
            <Link key={item.id} href={item.href}>
              <Card
                className={cn(
                  'group h-full p-6 transition-all duration-200 cursor-pointer hover:-translate-y-0.5',
                  accentStyles[item.accent as keyof typeof accentStyles] ?? accentStyles.default,
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
