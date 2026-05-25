'use client'

import { createBrowserClient } from '@supabase/ssr'
import { processLock, type SupabaseClient } from '@supabase/supabase-js'
import { getPublicSupabaseAnonKey, getPublicSupabaseUrl } from './supabase-public-env'

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
  // Avoid navigator.locks (cross-tab "steal" AbortError when multiple tabs or
  // React Strict Mode compete). processLock serializes auth within this tab only.
  browserSingleton = createBrowserClient(url, key, {
    auth: { lock: processLock },
  })
  return browserSingleton
}

export function createSupabaseBrowserClient(): SupabaseClient | null {
  return getSupabaseBrowserClient()
}
