'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { browserAuthLockNoOp } from './supabase-auth-lock'
import { getPublicSupabaseAnonKey, getPublicSupabaseUrl } from './supabase-public-env'

export { browserAuthLockNoOp } from './supabase-auth-lock'

let browserSingleton: SupabaseClient | undefined

/**
 * Returns a Supabase browser client, or null if public env vars are missing/invalid.
 * Callers must handle null (offline / misconfigured deployment).
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (browserSingleton) return browserSingleton
  const url = getPublicSupabaseUrl()
  const key = getPublicSupabaseAnonKey()
  if (!url || !key) {
    return null
  }
  browserSingleton = createBrowserClient(url, key, {
    auth: {
      lock: browserAuthLockNoOp,
      // Avoid competing with many parallel getUser() calls during hydration.
      lockAcquireTimeout: 0,
    },
  })
  return browserSingleton
}

export function createSupabaseBrowserClient(): SupabaseClient | null {
  return getSupabaseBrowserClient()
}

let getUserInFlight: Promise<{ data: { user: User | null } }> | null = null

/** Dedupe concurrent getUser() calls from layout/header components. */
export async function getBrowserAuthUser(): Promise<User | null> {
  const client = getSupabaseBrowserClient()
  if (!client) return null

  if (!getUserInFlight) {
    getUserInFlight = client.auth.getUser().finally(() => {
      getUserInFlight = null
    })
  }

  const { data } = await getUserInFlight
  return data.user ?? null
}
