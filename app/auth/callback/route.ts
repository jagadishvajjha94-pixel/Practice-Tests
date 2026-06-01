import { NextRequest, NextResponse } from 'next/server';

/** Legacy OAuth callback — NextAuth handles auth at /api/auth/[...nextauth]. */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get('next') || '/home';
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
