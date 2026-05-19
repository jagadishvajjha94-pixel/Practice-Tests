import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Practice Arena — PrepIndia',
  description: 'Daily challenges, topic practice, streaks, and contests.',
};

export default function PracticePortalPage() {
  return (
    <div className="app-page">
      <header className="app-page-header">
        <div className="max-w-5xl mx-auto px-4 space-y-2">
          <span className="app-eyebrow">Practice arena</span>
          <h1 className="app-title-xl">Drills, contests, and streaks</h1>
          <p className="app-subtitle">
            Topic-wise practice, daily challenges, and contest mode — built on top of your existing
            assessment engine.
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-5">
        <Card className="p-6 app-card-hover">
          <div className="text-3xl mb-3" aria-hidden>
            📚
          </div>
          <h2 className="app-section-title">Aptitude & MCQ practice</h2>
          <p className="text-sm text-slate-600 mt-2 mb-5">
            Psychometric, competitive paper, and category-wise question banks — single click access.
          </p>
          <Button asChild>
            <Link href="/tests">Open tests hub →</Link>
          </Button>
        </Card>

        <Card className="p-6 app-card-hover">
          <div className="text-3xl mb-3" aria-hidden>
            💻
          </div>
          <h2 className="app-section-title">Coding workspace</h2>
          <p className="text-sm text-slate-600 mt-2 mb-5">
            Monaco editor with multi-language run, sample I/O, and hidden test cases.
          </p>
          <Button asChild variant="outline">
            <Link href="/coding">Open coding lab →</Link>
          </Button>
        </Card>

        <Card className="p-6 md:col-span-2">
          <h2 className="app-section-title">Coming soon to this module</h2>
          <ul className="mt-4 grid sm:grid-cols-2 gap-2 text-sm text-slate-600">
            {[
              'Daily coding challenge',
              'Difficulty filters & topic tags',
              'Streak tracking',
              'Saved questions & bookmarks',
              'AI hints on demand',
              'Contest sessions',
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#1e3a5f]/40" />
                {feature}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
