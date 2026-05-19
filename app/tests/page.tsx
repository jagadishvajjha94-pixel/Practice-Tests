import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { PRACTICE_HUB_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Practice Tests — RCE',
  description: 'Practice psychometric, SWARX, AI interview, and competitive exam modules',
};

const accentStyles = {
  default: 'app-card-hover',
  blue: 'app-card-hover ring-1 ring-[#1e3a5f]/10',
  emerald: 'app-card-hover ring-1 ring-emerald-100',
  evalora: '', // Rendered with a fully custom layout below.
} as const;

export default function TestsPage() {
  const featured = PRACTICE_HUB_ITEMS.find((i) => 'featured' in i && i.featured);
  const others = PRACTICE_HUB_ITEMS.filter((i) => i !== featured);

  return (
    <div className="app-page">
      <header className="app-page-header">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <span className="app-eyebrow">Assessment library</span>
          <h1 className="app-title-xl">Practice tests</h1>
          <p className="app-subtitle">
            Choose any module — placement, psychometric, communication, AI interview, competitive
            papers, or programming. All access is included with your portal account.
          </p>
        </div>
      </header>

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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {others.map((item) => (
            <Link key={item.id} href={item.href} className="block group">
              <Card
                className={cn(
                  'group h-full p-6 transition-all duration-200',
                  accentStyles[item.accent as keyof typeof accentStyles] ?? accentStyles.default,
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="text-4xl">{item.icon}</div>
                  {item.badge ? (
                    <span
                      className={cn(
                        'app-pill',
                        item.accent === 'emerald'
                          ? 'app-pill-success'
                          : item.accent === 'blue'
                            ? 'app-pill-brand'
                            : 'app-pill-neutral',
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <h2 className="text-lg font-bold text-[#0c2340] mb-2 tracking-tight">{item.name}</h2>
                <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
                <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1e3a5f]">
                  {'cta' in item && item.cta
                    ? item.cta
                    : item.accent === 'emerald'
                      ? 'Enter examination hall'
                      : item.accent === 'blue'
                        ? 'Open module'
                        : 'Start practicing'}
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
