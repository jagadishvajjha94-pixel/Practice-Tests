'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

function isConfiguredValue(v: string | undefined) {
  if (!v) return false;
  const trimmed = v.trim();
  if (!trimmed) return false;
  if (trimmed.includes('YOUR_')) return false;
  return true;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isSupabaseConfigured =
    isConfiguredValue(supabaseUrl) && isConfiguredValue(supabaseAnonKey);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!isSupabaseConfigured) {
      setError(
        'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
      );
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      );
      if (resetError) throw resetError;
      setMessage('Password reset link sent. Please check your email.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not send password reset email.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <Card className="w-full max-w-md">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Forgot Password
          </h1>
          <p className="text-gray-600 mb-6">
            Enter your email to receive a reset link.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !isSupabaseConfigured}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Remember your password?{' '}
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Back to sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
