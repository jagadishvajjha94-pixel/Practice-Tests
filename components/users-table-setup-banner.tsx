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
    <div className="rounded-lg border border-sky-400/40 bg-sky-500/10 px-4 py-3 space-y-3">
      <p className="text-sm text-sky-100">
        Your profile is being saved to your auth account because the database table
        (<code className="text-sky-50">public.users</code>) has not been created yet. Edits work fine —
        run the one-time setup below to unlock dashboard analytics and admin features.
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <Button type="button" size="sm" disabled={busy} onClick={() => void runSetup()}>
          {busy ? 'Setting up…' : 'Create profile table'}
        </Button>
        <span className="text-xs text-muted-foreground">
          Or run <code>supabase/migrations/001_users_resume.sql</code> in Supabase → SQL Editor
        </span>
      </div>
      {note ? <p className="text-xs text-sky-100/90">{note}</p> : null}
    </div>
  );
}
