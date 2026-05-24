import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  defaultRedirectForRole,
  isAdminRoute,
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
    const signupPaths = ['/auth/signup', '/auth/signup/student'];
    if (signupPaths.includes(request.nextUrl.pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/role';
      url.searchParams.set('notice', 'signup_closed');
      return NextResponse.redirect(url);
    }
  }

  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/faculty') || pathname.startsWith('/auth/login/faculty') || pathname.startsWith('/auth/signup/faculty')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith('/auth/') ? '/auth/role' : '/admin/exam-builder';
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/admin/approvals')) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/exam-builder';
    return NextResponse.redirect(url);
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
    (pathname.startsWith('/exams') ||
      pathname.startsWith('/home') ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/placement') ||
      pathname.startsWith('/tests/rmset') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/profile') ||
      pathname.startsWith('/checkout') ||
      pathname.startsWith('/ai') ||
      pathname.startsWith('/tests/competitive-exam'))
  ) {
    const loginUrl = new URL('/auth/role', request.url)
    loginUrl.searchParams.set('redirect', `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  if (user) {
    const resolved = await resolveAppUser(supabase)
    const role = resolved?.role ?? 'student'

    if (pathname === '/') {
      return NextResponse.redirect(new URL(defaultRedirectForRole(role), request.url))
    }

    if (role === 'admin') {
      if (isStudentExperienceRoute(pathname)) {
        return NextResponse.redirect(new URL(defaultRedirectForRole('admin'), request.url))
      }
    }

    if (role === 'student') {
      if (isAdminRoute(pathname)) {
        return NextResponse.redirect(new URL('/exams', request.url))
      }
      if (
        pathname === '/dashboard' ||
        pathname.startsWith('/dashboard/') ||
        pathname === '/home' ||
        pathname === '/profile' ||
        pathname.startsWith('/ai/')
      ) {
        return NextResponse.redirect(new URL('/exams', request.url))
      }
      if (pathname === '/tests' || pathname === '/placement') {
        return NextResponse.redirect(new URL('/exams', request.url))
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
