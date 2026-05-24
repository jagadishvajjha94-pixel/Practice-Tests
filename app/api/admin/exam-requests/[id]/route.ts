import { NextRequest, NextResponse } from 'next/server';
import { publishFacultyExamRequest, publishFacultyExamSlot } from '@/lib/publish-faculty-exam';
import { pendingSlotNumbers } from '@/lib/exam-slot-approval';
import { parseScheduleSlotsJson } from '@/lib/exam-schedule-slots';
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

  let body: { action?: string; admin_note?: string; slot_number?: number };
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
    const { data: requestRow } = await admin
      .from('faculty_exam_requests')
      .select('uses_slot_scheduling, schedule_slots_json')
      .eq('id', id)
      .maybeSingle();

    if (requestRow?.uses_slot_scheduling) {
      const slotNumber = Math.floor(Number(body.slot_number));
      if (!slotNumber || slotNumber < 1 || slotNumber > 8) {
        const pending = pendingSlotNumbers(parseScheduleSlotsJson(requestRow.schedule_slots_json));
        return NextResponse.json(
          {
            error:
              pending.length > 0
                ? `slot_number is required. Pending: Slot ${pending.join(', Slot ')}.`
                : 'slot_number (1–8) is required for slot-scheduled exams.',
          },
          { status: 400 },
        );
      }

      const { testId, all_slots_approved } = await publishFacultyExamSlot(
        admin,
        id,
        slotNumber,
        auth.ctx.resolved.id,
      );

      if (body.admin_note?.trim()) {
        await admin
          .from('faculty_exam_requests')
          .update({ admin_note: body.admin_note.trim() })
          .eq('id', id);
      }

      return NextResponse.json({
        ok: true,
        status: all_slots_approved ? 'approved' : 'pending',
        test_id: testId,
        slot_number: slotNumber,
        all_slots_approved,
      });
    }

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
