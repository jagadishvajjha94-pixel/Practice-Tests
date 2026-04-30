import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata = {
  title: 'Access Confirmed - PrepIndia',
  description: 'Platform access is free for all students',
};

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="text-6xl mb-6">✅</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">You&apos;re All Set</h1>
        <p className="text-gray-600 mb-6">
          Payment features are disabled and all students now get free access to practice content.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-blue-900 mb-3">Available now:</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✓ Unlimited practice tests</li>
            <li>✓ Full question bank access</li>
            <li>✓ Test history and results</li>
            <li>✓ Interview preparation tools</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Link href="/dashboard" className="block">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/tests" className="block">
            <Button variant="outline" className="w-full">
              Start Practicing
            </Button>
          </Link>
        </div>

        <p className="text-xs text-gray-500 mt-6">No subscription management is required.</p>
      </Card>
    </div>
  );
}
