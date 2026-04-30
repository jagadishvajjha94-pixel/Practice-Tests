import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata = {
  title: 'PrepIndia - Master Placements & Aptitude Tests',
  description: 'Complete platform for placement preparation. Practice aptitude tests, mock interviews, and company-specific assessments.',
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-blue-600">PrepIndia</div>
          <div className="flex gap-4 items-center">
            <Link href="/tests" className="text-gray-600 hover:text-gray-900">
              Tests
            </Link>
            <Link href="/blog" className="text-gray-600 hover:text-gray-900">
              Blog
            </Link>
            <Link href="/setup" className="text-gray-600 hover:text-gray-900 text-sm">
              Setup
            </Link>
            <Link href="/auth/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">Master Your Placement Preparation</h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Practice aptitude tests, crack interviews, and land your dream job. Join thousands of students already preparing with PrepIndia.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/tests">
              <Button className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold">
                Practice Free Tests
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="outline" className="border-white text-white hover:bg-blue-600 px-8 py-3 text-lg font-semibold">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Why Choose PrepIndia?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">5000+ Questions</h3>
              <p className="text-gray-600">
                Comprehensive question bank covering all types of aptitude tests and company-specific assessments.
              </p>
            </Card>
            <Card className="p-6">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Feedback</h3>
              <p className="text-gray-600">
                Get instant results with detailed explanations for every question to learn from your mistakes.
              </p>
            </Card>
            <Card className="p-6">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Expert Content</h3>
              <p className="text-gray-600">
                Content designed by placement experts and verified by top company professionals.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Test Categories */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Available Test Category</h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-md mx-auto">
            {[
              { icon: '🎭', name: 'Psychometric' },
            ].map((category) => (
              <Card key={category.name} className="p-6 text-center hover:shadow-lg transition">
                <div className="text-3xl mb-2">{category.icon}</div>
                <p className="font-semibold text-gray-900">{category.name}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10000+</div>
              <p className="text-blue-100">Active Students</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">5000+</div>
              <p className="text-blue-100">Practice Questions</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <p className="text-blue-100">Full Tests</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">95%</div>
              <p className="text-blue-100">Success Rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* Access Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Free Access for All Students</h2>
          <Card className="p-8 text-center max-w-3xl mx-auto">
            <p className="text-gray-700 text-lg mb-4">
              PrepIndia now provides all practice features at no cost.
            </p>
            <p className="text-gray-600 mb-8">
              Create your account and start practicing tests immediately across all categories.
            </p>
            <Link href="/auth/signup">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                Create Free Account
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: 'How many tests can I take?',
                a: 'You can practice all available tests for free.',
              },
              {
                q: 'Do I need to pay to use PrepIndia?',
                a: 'No. The platform is currently free for all students.',
              },
              {
                q: 'Are the questions updated regularly?',
                a: 'Yes, our question bank is updated monthly with latest patterns and questions.',
              },
              { q: 'How often is content updated?', a: 'Question pools and practice flows are updated regularly.' },
            ].map((faq, index) => (
              <Card key={index} className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Start Your Preparation Journey Today</h2>
          <p className="text-blue-100 mb-8">Join thousands of students who have already started preparing with PrepIndia</p>
          <Link href="/auth/signup">
            <Button className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold">
              Sign Up for Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4">PrepIndia</h4>
              <p className="text-gray-400 text-sm">Master your placement preparation with our comprehensive platform.</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="/tests" className="hover:text-white">Tests</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link href="/auth/signup" className="hover:text-white">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
                <li><a href="#" className="hover:text-white">Help</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2024 PrepIndia. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
