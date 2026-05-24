import { NextRequest, NextResponse } from 'next/server';
import { deleteFacultyExamRequest } from '@/lib/delete-faculty-exam';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(['faculty']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const { id } = await context.params;

  const { data: request, error: fetchErr } = await admin
    .from('faculty_exam_requests')
    .select('id, faculty_user_id, title, status')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!request) {
    return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
  }
  if (String(request.faculty_user_id) !== auth.ctx.resolved.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await deleteFacultyExamRequest(admin, id);
  if ('error' in result && !('requestId' in result)) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: `Deleted "${request.title ?? 'exam'}".`,
    ...result,
  });
}
