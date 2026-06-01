'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { isClientAuthConfigured, AUTH_SETUP_MESSAGE } from '@/lib/client-auth-env';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authConfigured = isClientAuthConfigured();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!authConfigured) {
      setError(AUTH_SETUP_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      setMessage(
        'Password reset is managed by your college admin. Contact the training & placement office to reset your password.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/90 shadow-xl">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Reset password</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Enter your registered email. An admin can reset your password on AWS RDS accounts.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-emerald-700">{message}</p>}

            <Button type="submit" className="w-full" disabled={loading || !authConfigured}>
              {loading ? 'Sending…' : 'Request reset'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/auth/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
