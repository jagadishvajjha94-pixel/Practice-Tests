'use client';

export function isAwsClientMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_AWS_STACK !== 'false';
}

export type ClientUser = { id: string; email?: string };

/** Resolve logged-in user via NextAuth session cookie. */
export async function getClientUser(): Promise<ClientUser | null> {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as { user?: { id?: string; email?: string } };
    if (!json.user?.id) return null;
    return { id: json.user.id, email: json.user.email };
  } catch {
    return null;
  }
}
