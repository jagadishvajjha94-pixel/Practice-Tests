import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { useAwsStack } from '@/lib/aws/stack';
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
  isSupabasePublicEnvConfigured,
} from '@/lib/supabase-public-env';
import { isExamProxyPathAllowed } from '@/lib/exam-gateway-allowlist';

const gatewayBase = () => (process.env.EXAM_GATEWAY_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');

async function getSupabaseUser(request: NextRequest) {
  if (!isSupabasePublicEnvConfigured()) return null;
  const supabase = createServerClient(getPublicSupabaseUrl()!, getPublicSupabaseAnonKey()!, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(_name: string, _value: string, _options: CookieOptions) {},
      remove(_name: string, _options: CookieOptions) {},
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function mergeUserIdIntoJsonBody(bodyText: string, userId: string): string {
  try {
    const parsed = JSON.parse(bodyText || '{}') as Record<string, unknown>;
    parsed.userId = userId;
    return JSON.stringify(parsed);
  } catch {
    return JSON.stringify({ userId });
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const internalToken = process.env.EXAM_INTERNAL_API_TOKEN;
  if (!internalToken) {
    return NextResponse.json(
      { error: 'EXAM_INTERNAL_API_TOKEN is not set. Add it to .env.local (server only).' },
      { status: 503 },
    );
  }

  const { path } = await ctx.params;
  const suffix = path.join('/');
  if (!isExamProxyPathAllowed(suffix)) {
    return NextResponse.json({ error: 'Path not allowed on exam proxy' }, { status: 403 });
  }

  let userId: string | null = null;
  if (useAwsStack()) {
    const session = await auth();
    userId = session?.user?.id ?? null;
  } else {
    const user = await getSupabaseUser(request);
    userId = user?.id ?? null;
  }
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const targetUrl = `${gatewayBase()}/exam/${suffix}`;
  const contentType = request.headers.get('content-type') || 'application/json';
  let bodyText = await request.text();
  if (contentType.includes('application/json')) {
    bodyText = mergeUserIdIntoJsonBody(bodyText, userId);
  }

  const upstream = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'x-internal-token': internalToken,
    },
    body: bodyText,
  });

  const outCt = upstream.headers.get('content-type') || 'application/json';
  const outBody = await upstream.text();
  return new NextResponse(outBody, { status: upstream.status, headers: { 'content-type': outCt } });
}
