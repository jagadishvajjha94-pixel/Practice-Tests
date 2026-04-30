'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const handleInitialize = async () => {
    setLoading(true);
    setStatus('Initializing database...');
    setError(null);

    try {
      // Initialize database with direct SQL
      const initResponse = await fetch('/api/setup/init-direct', { method: 'POST' });
      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        throw new Error(errorData.error || 'Database initialization failed');
      }

      setStatus('Seeding sample data...');

      // Seed with sample data
      const seedResponse = await fetch('/api/setup/seed-direct', { method: 'POST' });
      if (!seedResponse.ok) {
        throw new Error('Data seeding failed');
      }

      setStatus('Setup completed successfully!');
      setCompleted(true);

      // Redirect to home after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Setup failed';
      console.error('[v0] Setup error:', errorMsg);
      setError(errorMsg);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">PrepIndia Setup</h1>
          <p className="text-gray-600 mb-6">Initialize the database for the first time</p>

          {completed && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              Setup completed! Redirecting...
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              Error: {error}
            </div>
          )}

          {status && !completed && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              {status}
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">This will:</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✓ Create database tables</li>
              <li>✓ Set up indexes and constraints</li>
              <li>✓ Load sample test categories</li>
              <li>✓ Load sample tests and questions</li>
              <li>✓ Load sample blog posts</li>
            </ul>
          </div>

          <Button
            onClick={handleInitialize}
            disabled={loading || completed}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Initializing...' : completed ? 'Completed' : 'Start Setup'}
          </Button>

          <p className="mt-6 text-center text-sm text-gray-600">
            You only need to do this once. After that, you can{' '}
            <a href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
              log in
            </a>{' '}
            normally.
          </p>
        </div>
      </Card>
    </div>
  );
}
