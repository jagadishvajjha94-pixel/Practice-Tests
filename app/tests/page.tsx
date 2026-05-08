import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { TEST_CATEGORIES } from '@/lib/constants';

export const metadata = {
  title: 'Practice Tests - PrepIndia',
  description: 'Practice psychometric and SWARX communication modules',
};

export default function TestsPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="py-12 border-b border-white/15 bg-black/20 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4 lux-heading">Practice Tests</h1>
          <p className="text-muted-foreground text-lg">Single portal access for psychometric and SWARX communication training</p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
          {TEST_CATEGORIES.map((category) => (
            <Link key={category.id} href={`/tests/${category.id}`}>
              <Card className="h-full p-6 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:border-white/30">
                <div className="text-4xl mb-4">{category.icon}</div>
                <h2 className="text-xl font-semibold text-foreground mb-2">{category.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {category.id === 'psychometric'
                    ? 'Quick visual and pattern drills — think fast in seconds per item, not long reading.'
                    : 'Practice mock interviews, communication drills, and resume review in SWARX.'}
                </p>
                <div className="mt-4 text-violet-200 text-sm font-medium">
                  Start Practicing →
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center lux-surface rounded-2xl p-8">
            <div>
              <div className="text-3xl font-bold text-fuchsia-300 mb-2">5000+</div>
              <p className="text-muted-foreground">Questions in our bank</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-violet-300 mb-2">50+</div>
              <p className="text-muted-foreground">Full-length mock tests</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-300 mb-2">10000+</div>
              <p className="text-muted-foreground">Students preparing</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
