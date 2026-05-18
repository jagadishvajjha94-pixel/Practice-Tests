import { NextResponse } from 'next/server';
import { executeCode, type CodingLanguage } from '@/lib/coding/execute';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      language?: string;
      sourceCode?: string;
      stdin?: string;
    };

    const language = (body.language ?? 'python') as CodingLanguage;
    const sourceCode = body.sourceCode?.trim() ?? '';

    if (!sourceCode) {
      return NextResponse.json({ error: 'sourceCode required' }, { status: 400 });
    }

    if (!['python', 'java', 'c'].includes(language)) {
      return NextResponse.json({ error: 'Unsupported language' }, { status: 400 });
    }

    const result = await executeCode(language, sourceCode, body.stdin ?? '');

    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const status = result.exitCode === 0 ? 'accepted' : 'error';
        await supabase.from('coding_submissions').insert({
          user_id: user.id,
          language,
          source_code: sourceCode,
          stdin: body.stdin ?? null,
          stdout: result.stdout,
          stderr: result.stderr,
          status,
          runtime_ms: result.runtimeMs,
          memory_kb: result.memoryKb,
        });
      }
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
