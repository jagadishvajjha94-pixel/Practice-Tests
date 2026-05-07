/**
 * Shared resolution for browser-visible Supabase settings.
 * Trims whitespace (common copy/paste issue on Vercel) and rejects template placeholders.
 */

import { formatSupabaseError } from '@/lib/utils';

function trimEnv(v: string | undefined): string | undefined {
  if (v === undefined || v === null) return undefined;
  const t = String(v).trim();
  return t.length ? t : undefined;
}

function isPlaceholder(value: string): boolean {
  return value.includes('YOUR_') || /^placeholder$/i.test(value);
}

/** Valid HTTP(S) project URL (hosted or self-hosted). */
export function getPublicSupabaseUrl(): string | undefined {
  const raw = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!raw || isPlaceholder(raw)) return undefined;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
    return raw;
  } catch {
    return undefined;
  }
}

export function getPublicSupabaseAnonKey(): string | undefined {
  // Supabase projects may expose either legacy ANON_KEY or newer PUBLISHABLE_KEY.
  const raw =
    trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ??
    trimEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (!raw || isPlaceholder(raw)) return undefined;
  return raw;
}

export function isSupabasePublicEnvConfigured(): boolean {
  return !!(getPublicSupabaseUrl() && getPublicSupabaseAnonKey());
}

/** User-facing hint for auth/setup screens */
export const SUPABASE_PUBLIC_ENV_MESSAGE =
  'Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in .env.local, or under Vercel -> Project -> Settings -> Environment Variables for Production and Preview, then redeploy.';

/** True when an exception likely means URL/anon key were missing or invalid for the client. */
export function isMissingPublicSupabaseConfigError(error: unknown): boolean {
  const msg = formatSupabaseError(error);
  return (
    /NEXT_PUBLIC_SUPABASE|Missing Supabase environment variables/i.test(msg) ||
    msg.includes('Add NEXT_PUBLIC_SUPABASE_URL')
  );
}
