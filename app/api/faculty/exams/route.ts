import { NextRequest, NextResponse } from 'next/server';
import { FACULTY_EXAM_YEARS, parseQuestionsJson } from '@/lib/faculty-exams';
import { isValidAcademicYear } from '@/lib/roles';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { createFacultyExamRequestRecord } from '@/lib/exam-builder/create-exam-request';
import { parseScheduleSlotsJson } from '@/lib/exam-schedule-slots';
import {
  ELEVATEX_PLACEHOLDER_QUESTIONS,
  isElevateXBuilderTestType,
} from '@/lib/exam-builder/elevatex-exam';

export async function GET() {
  const auth = await requireAuth(['faculty']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  const client = admin ?? auth.ctx.supabase;

  const { data, error } = await client
    .from('faculty_exam_requests')
    .select('*')
    .eq('faculty_user_id', auth.ctx.resolved.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(['faculty']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  let body: {
    title?: string;
    description?: string;
    topic?: string;
    target_years?: string[];
    target_branches?: string[];
    duration_minutes?: number;
    questions?: unknown[];
    test_type?: string;
    slot_key?: string;
    syllabus_topic_ids?: string[];
    questions_per_topic?: number;
    department_group_id?: string;
    uses_slot_scheduling?: boolean;
    schedule_slots?: unknown[];
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const targetYears = (body.target_years ?? []).filter((y) => isValidAcademicYear(y));
  if (targetYears.length === 0) {
    return NextResponse.json(
      { error: `Select at least one year: ${FACULTY_EXAM_YEARS.join(', ')}` },
      { status: 400 },
    );
  }

  const isElevateX = isElevateXBuilderTestType(body.test_type);
  const usesSlotScheduling = Boolean(body.uses_slot_scheduling) || isElevateX;
  const scheduleSlots = usesSlotScheduling ? parseScheduleSlotsJson(body.schedule_slots) : [];
  const questions = isElevateX
    ? ELEVATEX_PLACEHOLDER_QUESTIONS
    : parseQuestionsJson(body.questions);
  if (!isElevateX && questions.length === 0) {
    return NextResponse.json({ error: 'Add at least one MCQ question' }, { status: 400 });
  }
  if (isElevateX && scheduleSlots.length === 0) {
    return NextResponse.json(
      { error: 'ElevateX requires 8-slot scheduling with student roster in each slot.' },
      { status: 400 },
    );
  }

  const { data: profile } = await admin
    .from('faculty_profiles')
    .select('department')
    .eq('user_id', auth.ctx.resolved.id)
    .maybeSingle();

  const department =
    profile?.department ?? auth.ctx.resolved.department ?? (auth.ctx.resolved.department as string);

  if (!department) {
    return NextResponse.json(
      { error: 'Set your department in faculty profile before uploading exams' },
      { status: 400 },
    );
  }

  const duration = Math.min(180, Math.max(5, Number(body.duration_minutes) || 30));
  const targetBranches = Array.from(
    new Set(
      (body.target_branches ?? [])
        .map((b) => String(b).trim())
        .filter((b) => b.length > 0 && b !== department),
    ),
  );
  const topic = body.topic?.trim() || null;

  try {
    const result = await createFacultyExamRequestRecord(admin, {
      creatorUserId: auth.ctx.resolved.id,
      primaryDepartment: department,
      title,
      description: body.description?.trim() ?? null,
      topic,
      targetYears,
      extraBranches: targetBranches,
      departmentGroupId: body.department_group_id ?? null,
      durationMinutes: duration,
      questions,
      testType: body.test_type?.trim() || null,
      slotKey: body.slot_key?.trim() || null,
      syllabusTopicIds: Array.isArray(body.syllabus_topic_ids) ? body.syllabus_topic_ids : [],
      questionsPerTopic: body.questions_per_topic ?? null,
      status: 'pending',
      autoPublish: false,
      usesSlotScheduling,
      scheduleSlots: usesSlotScheduling ? scheduleSlots : undefined,
    });

    const { data } = await admin
      .from('faculty_exam_requests')
      .select('*')
      .eq('id', result.requestId)
      .single();

    return NextResponse.json({ request: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Submit failed' },
      { status: 400 },
    );
  }
}
