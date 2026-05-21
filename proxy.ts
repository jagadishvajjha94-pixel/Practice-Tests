import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  defaultRedirectForRole,
  isAdminRoute,
  isFacultyRoute,
  isStudentExperienceRoute,
  resolveAppUser,
} from '@/lib/roles'
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

  if (!isSupabasePublicEnvConfigured()) {
    return response
  }

  const supabaseUrl = getPublicSupabaseUrl()!
  const supabaseAnonKey = getPublicSupabaseAnonKey()!
  const pathname = request.nextUrl.pathname

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
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

  if (
    !user &&
    (pathname.startsWith('/home') ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/placement') ||
      pathname.startsWith('/tests/rmset') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/faculty') ||
      pathname.startsWith('/profile') ||
      pathname.startsWith('/checkout') ||
      pathname.startsWith('/ai') ||
      pathname.startsWith('/tests/competitive-exam'))
  ) {
    const loginUrl = new URL(
      pathname.startsWith('/faculty') ? '/auth/login/faculty' : '/auth/role',
      request.url,
    )
    loginUrl.searchParams.set('redirect', `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  if (user) {
    const resolved = await resolveAppUser(supabase)
    const role = resolved?.role ?? 'student'

    if (pathname === '/') {
      return NextResponse.redirect(new URL(defaultRedirectForRole(role), request.url))
    }

    if (role === 'faculty') {
      if (isAdminRoute(pathname) || isStudentExperienceRoute(pathname)) {
        return NextResponse.redirect(new URL(defaultRedirectForRole('faculty'), request.url))
      }
    }

    if (role === 'admin') {
      if (isFacultyRoute(pathname) || isStudentExperienceRoute(pathname)) {
        return NextResponse.redirect(new URL(defaultRedirectForRole('admin'), request.url))
      }
    }

    if (role === 'student') {
      if (isFacultyRoute(pathname) || isAdminRoute(pathname)) {
        return NextResponse.redirect(new URL('/home', request.url))
      }
      if (pathname === '/tests') {
        return NextResponse.redirect(new URL('/home', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
