import { NextResponse } from 'next/server';
import { generateWithAi } from '@/lib/ai/providers/registry';
import type { AiGenerateRequest, AiTaskType } from '@/lib/ai/providers/types';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const ALLOWED_TASKS: AiTaskType[] = [
  'mcq_generate',
  'coding_question_generate',
  'interview_question_generate',
  'performance_analyze',
  'coding_hint',
  'code_explain',
  'resume_analyze',
  'recommend',
];

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as AiGenerateRequest;
    if (!body?.task || !ALLOWED_TASKS.includes(body.task)) {
      return NextResponse.json({ error: 'Invalid task type' }, { status: 400 });
    }
    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const result = await generateWithAi(body);

    try {
      await supabase.from('ai_reports').insert({
        user_id: user.id,
        report_type: body.task,
        provider: result.provider,
        model: result.model,
        input_summary: body.prompt.slice(0, 500),
        output_json: { text: result.text },
      });
    } catch {
      /* table may not exist until migration 002 */
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI generation failed';
    const status = message.includes('not configured') ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
