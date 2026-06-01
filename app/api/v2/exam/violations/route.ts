import { NextResponse } from 'next/server';
import { getDbService } from '@/lib/db/get-db-service';
import { requireAuth } from '@/lib/server-auth';

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(['student', 'admin'], request);
    const userId = 'response' in auth ? null : auth.ctx.user.id;

    const db = getDbService();
    const body = (await request.json()) as {
      testId?: string;
      attemptId?: string;
      type?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.type) {
      return NextResponse.json({ error: 'type required' }, { status: 400 });
    }

    const { error } = await db.from('exam_violations').insert({
      user_id: userId,
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
