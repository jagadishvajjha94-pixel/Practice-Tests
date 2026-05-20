import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
  isSupabasePublicEnvConfigured,
} from '@/lib/supabase-public-env'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/home'

  if (!isSupabasePublicEnvConfigured()) {
    return NextResponse.redirect(
      new URL(
        `/auth/error?message=${encodeURIComponent('Supabase is not configured for this deployment.')}`,
        requestUrl.origin
      )
    )
  }

  const supabaseUrl = getPublicSupabaseUrl()!
  const supabaseAnonKey = getPublicSupabaseAnonKey()!

  if (code) {
    const redirectTarget = new URL(next, requestUrl.origin)
    let response = NextResponse.redirect(redirectTarget)

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.delete({ name, ...options })
        },
      },
    })

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent(error.message)}`, requestUrl.origin)
      )
    }

    return response
  }

  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
}
