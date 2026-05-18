import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { User } from '@/lib/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Supabase/PostgREST errors often log as `{}` in DevTools unless message/code are read explicitly. */
export function formatSupabaseError(err: unknown): string {
  if (err == null) return 'Unknown error'
  if (err instanceof Error) return err.message
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>
    const message = typeof o.message === 'string' ? o.message : ''
    const code = typeof o.code === 'string' ? o.code : ''
    const details = typeof o.details === 'string' ? o.details : ''
    const hint = typeof o.hint === 'string' ? o.hint : ''
    const parts = [message, code && `code=${code}`, details, hint].filter(Boolean)
    if (parts.length) return parts.join(' | ')
    try {
      return JSON.stringify(err)
    } catch {
      return Object.prototype.toString.call(err)
    }
  }
  return String(err)
}

/** Minimal profile when `public.users` row is missing or insert failed. */
export function buildUserFromAuth(authUser: {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}): User {
  const now = new Date().toISOString()
  return {
    id: authUser.id,
    email: authUser.email || '',
    full_name: (authUser.user_metadata?.full_name as string | undefined) || 'User',
    phone: null,
    subscription_status: 'free',
    subscription_end_date: null,
    created_at: now,
    updated_at: now,
  }
}
