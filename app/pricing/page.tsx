import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata = {
  title: 'Access - PrepIndia',
  description: 'PrepIndia is free for all students',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">PrepIndia Is Free</h1>
          <p className="text-blue-100 text-lg">All students get full practice access at no cost</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-16">
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What You Get</h2>
          <ul className="space-y-3 text-gray-700 mb-8">
            <li>✓ Full access to all practice test categories</li>
            <li>✓ Unlimited practice attempts</li>
            <li>✓ Instant results and score tracking</li>
            <li>✓ Mock interview and preparation utilities</li>
          </ul>
          <Link href="/tests">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Start Practicing
            </Button>
          </Link>
        </Card>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to start?</h2>
          <p className="text-blue-100 mb-8">Join thousands of students preparing for success</p>
          <Link href="/auth/signup">
            <Button className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 font-semibold">
              Create Free Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
