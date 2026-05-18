import { NextResponse } from 'next/server';
import { executeCode } from '@/lib/coding/execute';
import { parseCodingRunRequest } from '@/lib/coding/parse-run-request';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key || url.includes('YOUR_') || key.includes('YOUR_')) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = parseCodingRunRequest(body);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { language, sourceCode, stdin } = parsed;
    const result = await executeCode(language, sourceCode, stdin);

    // Optional run log (never block execution on DB / schema errors)
    try {
      const service = getServiceSupabase();
      const session = await getSupabaseServerClient();
      const userId = session
        ? (await session.auth.getUser()).data.user?.id
        : undefined;
      if (service && userId) {
        await service.from('coding_submissions').insert({
          user_id: userId,
          language,
          source_code: sourceCode,
          stdin: stdin || null,
          stdout: result.stdout,
          stderr: result.stderr,
          status: result.exitCode === 0 ? 'accepted' : 'error',
          runtime_ms: result.runtimeMs,
          memory_kb: result.memoryKb,
        });
      }
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      runtimeMs: result.runtimeMs,
      memoryKb: result.memoryKb,
      engine: result.engine,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Execution failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
