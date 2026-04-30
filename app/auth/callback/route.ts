import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  console.log('[v0] Email confirmation callback:', {
    code: code ? 'present' : 'missing',
    next,
    origin: requestUrl.origin,
  });

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    try {
      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('[v0] Email confirmation error:', error);
        return NextResponse.redirect(
          new URL(`/auth/error?message=${encodeURIComponent(error.message)}`, requestUrl.origin)
        );
      }

      console.log('[v0] Email confirmed successfully');
      
      // Redirect to next page (dashboard by default)
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } catch (err) {
      console.error('[v0] Email confirmation exception:', err);
      return NextResponse.redirect(
        new URL(
          `/auth/error?message=${encodeURIComponent('Email confirmation failed')}`,
          requestUrl.origin
        )
      );
    }
  }

  // If no code, redirect to login
  console.warn('[v0] No confirmation code provided');
  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin));
}
