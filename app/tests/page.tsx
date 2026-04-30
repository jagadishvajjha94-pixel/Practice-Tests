import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { TEST_CATEGORIES } from '@/lib/constants';

export const metadata = {
  title: 'Practice Tests - PrepIndia',
  description: 'Practice psychometric and SWARX communication modules',
};

export default function TestsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Practice Tests</h1>
          <p className="text-blue-100 text-lg">Single portal access for psychometric and SWARX communication training</p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
          {TEST_CATEGORIES.map((category) => (
            <Link key={category.id} href={`/tests/${category.id}`}>
              <Card className="h-full p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer">
                <div className="text-4xl mb-4">{category.icon}</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{category.name}</h2>
                <p className="text-sm text-gray-600">
                  {category.id === 'psychometric'
                    ? 'Understand personality patterns, consistency, and behavioral preferences.'
                    : 'Practice mock interviews, communication drills, and resume review in SWARX.'}
                </p>
                <div className="mt-4 text-blue-600 text-sm font-medium">
                  Start Practicing →
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">5000+</div>
              <p className="text-gray-600">Questions in our bank</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">50+</div>
              <p className="text-gray-600">Full-length mock tests</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">10000+</div>
              <p className="text-gray-600">Students preparing</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
