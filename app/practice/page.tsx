import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Practice Arena — PrepIndia',
  description: 'Daily challenges, topic practice, streaks, and contests.',
};

export default function PracticePortalPage() {
  return (
    <div className="min-h-screen">
      <header className="app-page-header">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <p className="text-sm uppercase tracking-wider text-primary mb-2">V2 · Practice</p>
          <h1 className="text-3xl font-bold text-foreground">Practice Arena</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Topic-wise drills, daily challenges, streaks, and contest mode — built on your existing test engine.
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-6">
        <Card className="p-6 lux-surface space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Aptitude & MCQ practice</h2>
          <p className="text-sm text-muted-foreground">
            Use the existing tests hub — psychometric, competitive exam, and category-wise banks.
          </p>
          <Button asChild>
            <Link href="/tests">Open tests hub</Link>
          </Button>
        </Card>

        <Card className="p-6 lux-surface space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Coding workspace</h2>
          <p className="text-sm text-muted-foreground">
            Monaco editor, multi-language run, hidden test cases (V2 module).
          </p>
          <Button asChild variant="outline">
            <Link href="/coding">Open coding lab</Link>
          </Button>
        </Card>

        <Card className="p-6 lux-surface space-y-4 md:col-span-2">
          <h2 className="text-lg font-semibold text-foreground">Coming in this module</h2>
          <ul className="text-sm text-muted-foreground grid sm:grid-cols-2 gap-2 list-disc pl-5">
            <li>Daily coding challenge</li>
            <li>Difficulty filters & topic tags</li>
            <li>Streak tracking</li>
            <li>Saved questions & bookmarks</li>
            <li>AI hints on demand</li>
            <li>Contest sessions</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
