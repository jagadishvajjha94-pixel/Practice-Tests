'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserSingleton: SupabaseClient | undefined

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserSingleton) return browserSingleton
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  browserSingleton = createBrowserClient(url, key)
  return browserSingleton
}

export function createSupabaseBrowserClient() {
  return getSupabaseBrowserClient()
}
