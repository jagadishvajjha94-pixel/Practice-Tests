'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { setupUsersTableViaApi } from '@/lib/user-profile';

export function UsersTableSetupBanner({ onReady }: { onReady?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const runSetup = async () => {
    setBusy(true);
    setNote(null);
    const result = await setupUsersTableViaApi();
    setNote(result.message);
    setBusy(false);
    if (result.ok) onReady?.();
  };

  return (
    <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-3 space-y-3">
      <p className="text-sm text-amber-100">
        Your profile database table (<code className="text-amber-50">public.users</code>) is not set up yet.
        That causes 404 errors when saving resume or profile data.
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <Button type="button" size="sm" disabled={busy} onClick={() => void runSetup()}>
          {busy ? 'Setting up…' : 'Create profile table'}
        </Button>
        <span className="text-xs text-muted-foreground">
          Or run <code>supabase/migrations/001_users_resume.sql</code> in Supabase → SQL Editor
        </span>
      </div>
      {note ? <p className="text-xs text-amber-100/90">{note}</p> : null}
    </div>
  );
}
