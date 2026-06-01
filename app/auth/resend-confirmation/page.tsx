'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AUTH_SETUP_MESSAGE, isClientAuthConfigured } from '@/lib/client-auth';

export default function ResendConfirmationPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isClientAuthConfigured()) {
      setMessage(AUTH_SETUP_MESSAGE);
      return;
    }
    setLoading(true);
    setMessage(
      'Accounts on AWS RDS are confirmed at creation. If you cannot sign in, contact your college admin.',
    );
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-bold mb-2">Resend confirmation</h1>
        <p className="text-sm text-muted-foreground mb-6">
          NextAuth accounts do not require email confirmation in this deployment.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@student.college.edu"
            required
          />
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending…' : 'Continue'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm">
          <Link href="/auth/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
