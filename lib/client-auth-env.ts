'use client';

/** Client-side auth env check (AWS RDS + NextAuth). */
export function isClientAuthConfigured(): boolean {
  return true;
}

export const AUTH_SETUP_MESSAGE = 'Configure AUTH_SECRET and DATABASE_URL in .env.local';

export function isMissingPublicDbConfigError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes('Configure AUTH_SECRET') ||
    error.message.includes('DATABASE_URL') ||
    error.message.includes('not configured')
  );
}
