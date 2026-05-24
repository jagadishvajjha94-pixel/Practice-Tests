import { NextRequest, NextResponse } from 'next/server';
import { publishFacultyExamRequest } from '@/lib/publish-faculty-exam';
import { deleteFacultyExamRequest } from '@/lib/delete-faculty-exam';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const { id } = await params;

  let body: { action?: string; admin_note?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const action = body.action?.toLowerCase();
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  }

  if (action === 'reject') {
    const { error } = await admin
      .from('faculty_exam_requests')
      .update({
        status: 'rejected',
        admin_note: body.admin_note?.trim() ?? null,
        reviewed_by: auth.ctx.resolved.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  try {
    const { testId } = await publishFacultyExamRequest(admin, id, auth.ctx.resolved.id);
    if (body.admin_note?.trim()) {
      await admin
        .from('faculty_exam_requests')
        .update({ admin_note: body.admin_note.trim() })
        .eq('id', id);
    }
    return NextResponse.json({ ok: true, status: 'approved', test_id: testId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Approval failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const { id } = await params;
  const result = await deleteFacultyExamRequest(admin, id);

  if ('error' in result && !('requestId' in result)) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: result.title ? `Deleted "${result.title}".` : 'Exam deleted.',
    ...result,
  });
}
