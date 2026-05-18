import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
  isSupabasePublicEnvConfigured,
} from '@/lib/supabase-public-env'

export async function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_SIGNUP_DISABLED === 'true') {
    const signupPaths = ['/auth/signup', '/auth/signup/student', '/auth/signup/faculty'];
    if (signupPaths.includes(request.nextUrl.pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/role';
      url.searchParams.set('notice', 'signup_closed');
      return NextResponse.redirect(url);
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Avoid crashing when Supabase env is missing, whitespace-only, or still set to template placeholders.
  if (!isSupabasePublicEnvConfigured()) {
    return response
  }

  const supabaseUrl = getPublicSupabaseUrl()!
  const supabaseAnonKey = getPublicSupabaseAnonKey()!

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Must forward request headers so refreshed auth cookies apply to this request (Supabase SSR + Vercel).
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.delete({
            name,
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect authenticated routes
  if (
    !user &&
    (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/admin') ||
      request.nextUrl.pathname.startsWith('/profile') ||
      request.nextUrl.pathname.startsWith('/checkout') ||
      request.nextUrl.pathname.startsWith('/ai') ||
      request.nextUrl.pathname.startsWith('/tests/competitive-exam'))
  ) {
    const loginUrl = new URL('/auth/role', request.url)
    loginUrl.searchParams.set('redirect', `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|public).*)',
  ],
}
