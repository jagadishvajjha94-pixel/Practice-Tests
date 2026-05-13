import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isSignupDisabled } from '@/lib/auth-features';

export const metadata = {
  title: 'PrepIndia - Master Placements & Aptitude Tests',
  description: 'Complete platform for placement preparation. Practice aptitude tests, mock interviews, and company-specific assessments.',
};

export default function Home() {
  const signupClosed = isSignupDisabled();

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/20 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="lux-heading text-2xl font-black">PrepIndia</div>
          <div className="flex items-center gap-4">
            <Link href="/tests" className="text-sm text-muted-foreground transition hover:text-foreground">
              Tests
            </Link>
            <Link href="/blog" className="text-sm text-muted-foreground transition hover:text-foreground">
              Blog
            </Link>
            <Link href="/setup" className="text-sm text-muted-foreground transition hover:text-foreground">
              Setup
            </Link>
            <Link href="/auth/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            {signupClosed ? (
              <Button variant="secondary" disabled title="Registration is temporarily closed">
                Sign up closed
              </Button>
            ) : (
              <Link href="/auth/signup">
                <Button>Sign Up</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24">
        <div className="lux-grid absolute inset-0 opacity-25" />
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 text-center">
          <p className="mb-4 inline-flex rounded-full border border-white/40 bg-white/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/80 backdrop-blur">
            Ultra Performance Test Platform
          </p>
          <h1 className="mx-auto mb-6 max-w-4xl text-5xl font-black leading-tight md:text-6xl">
            <span className="lux-heading">Master Your Placement Preparation</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Practice aptitude tests, crack interviews, and land your dream job. Join thousands of students already preparing with PrepIndia.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/tests">
              <Button className="px-8 py-3 text-lg">
                Practice Free Tests
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" className="border-primary/30 bg-white/60 px-8 py-3 text-lg backdrop-blur hover:bg-white/90">
                Student sign in
              </Button>
            </Link>
            {!signupClosed ? (
              <Link href="/auth/signup">
                <Button variant="outline" className="border-primary/30 bg-white/60 px-8 py-3 text-lg backdrop-blur hover:bg-white/90">
                  Get Started
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-12 text-center text-3xl font-black text-foreground md:text-4xl">Why Choose PrepIndia?</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="p-6 transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">5000+ Questions</h3>
              <p className="text-muted-foreground">
                Comprehensive question bank covering all types of aptitude tests and company-specific assessments.
              </p>
            </Card>
            <Card className="p-6 transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">Real-time Feedback</h3>
              <p className="text-muted-foreground">
                Get instant results with detailed explanations for every question to learn from your mistakes.
              </p>
            </Card>
            <Card className="p-6 transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">Expert Content</h3>
              <p className="text-muted-foreground">
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
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <Card className="bg-gradient-to-br from-primary via-primary to-accent p-10 text-primary-foreground">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10000+</div>
              <p className="text-primary-foreground/80">Active Students</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">5000+</div>
              <p className="text-primary-foreground/80">Practice Questions</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <p className="text-primary-foreground/80">Full Tests</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">95%</div>
              <p className="text-primary-foreground/80">Success Rate</p>
            </div>
          </div>
          </Card>
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
              {signupClosed
                ? 'Sign in with the account provided by your institution. New registration is temporarily closed.'
                : 'Create your account and start practicing tests immediately across all categories.'}
            </p>
            {signupClosed ? (
              <Link href="/auth/login">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8">Sign in</Button>
              </Link>
            ) : (
              <Link href="/auth/signup">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                  Create Free Account
                </Button>
              </Link>
            )}
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
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Card className="bg-gradient-to-r from-primary via-primary to-accent p-10 text-primary-foreground">
          <h2 className="text-3xl font-bold mb-6">Start Your Preparation Journey Today</h2>
          <p className="mb-8 text-primary-foreground/80">Join thousands of students who have already started preparing with PrepIndia</p>
          <Link href={signupClosed ? '/auth/login' : '/auth/signup'}>
            <Button variant="outline" className="border-white/70 bg-white/90 px-8 py-3 text-lg font-semibold text-primary hover:bg-white">
              {signupClosed ? 'Student sign in' : 'Sign up for free'}
            </Button>
          </Link>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-foreground">
        <div className="max-w-6xl mx-auto px-4">
          <Card className="p-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4">PrepIndia</h4>
              <p className="text-sm text-muted-foreground">Master your placement preparation with our comprehensive platform.</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/tests" className="hover:text-foreground">Tests</Link></li>
                <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
                <li><Link href={signupClosed ? '/auth/login' : '/auth/signup'} className="hover:text-foreground">
                  {signupClosed ? 'Sign in' : 'Get Started'}
                </Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Contact Us</a></li>
                <li><a href="#" className="hover:text-foreground">FAQ</a></li>
                <li><a href="#" className="hover:text-foreground">Help</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 PrepIndia. All rights reserved.</p>
          </div>
          </Card>
        </div>
      </footer>
    </div>
  );
}
