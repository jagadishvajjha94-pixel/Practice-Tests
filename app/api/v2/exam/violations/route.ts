import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ ok: true, stored: false });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = (await request.json()) as {
      testId?: string;
      attemptId?: string;
      type?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.type) {
      return NextResponse.json({ error: 'type required' }, { status: 400 });
    }

    const { error } = await supabase.from('exam_violations').insert({
      user_id: user?.id ?? null,
      test_id: body.testId ?? null,
      attempt_id: body.attemptId ?? null,
      violation_type: body.type,
      metadata: body.metadata ?? null,
    });

    if (error) {
      return NextResponse.json({ ok: true, stored: false, note: error.message });
    }

    return NextResponse.json({ ok: true, stored: true });
  } catch {
    return NextResponse.json({ ok: true, stored: false });
  }
}
