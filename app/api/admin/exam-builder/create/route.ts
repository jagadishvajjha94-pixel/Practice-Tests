import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { parseQuestionsJson } from '@/lib/faculty-exams';
import { getExamBuilderTestType } from '@/lib/exam-builder/test-catalog';
import { drawExamQuestionsFromTopics } from '@/lib/exam-builder/draw-questions';
import { createFacultyExamRequestRecord } from '@/lib/exam-builder/create-exam-request';
import { isValidAcademicYear } from '@/lib/roles';
import { DEPARTMENTS } from '@/lib/college-brand';
import {
  ELEVATEX_PLACEHOLDER_QUESTIONS,
  isElevateXBuilderTestType,
  studentTakeUrlForTestId,
} from '@/lib/exam-builder/elevatex-exam';
import { parseScheduleSlotsJson } from '@/lib/exam-schedule-slots';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const testType = String(body.testType ?? 'aptitude');
  const def = getExamBuilderTestType(testType);
  if (!def) return NextResponse.json({ error: 'Invalid test type' }, { status: 400 });

  const isElevateX = isElevateXBuilderTestType(testType);
  const usesSlotScheduling = Boolean(body.usesSlotScheduling);
  const scheduleSlots = usesSlotScheduling ? parseScheduleSlotsJson(body.scheduleSlots) : [];

  if (isElevateX && !usesSlotScheduling) {
    return NextResponse.json(
      { error: 'ElevateX requires 8-slot scheduling with student roster.' },
      { status: 400 },
    );
  }

  const title = String(body.title ?? '').trim() || `${def.name} Examination`;
  const slotKey = String(body.slotKey ?? 'slot-1');
  const topicIds = Array.isArray(body.topicIds) ? (body.topicIds as string[]) : [];
  const questionsPerTopic = Number(body.questionsPerTopic) || def.defaultQuestionsPerTopic;
  const durationMinutes = Number(body.durationMinutes) || def.defaultDurationMinutes;
  const targetYears = (Array.isArray(body.targetYears) ? body.targetYears : []).filter((y) =>
    isValidAcademicYear(String(y)),
  );
  const primaryDepartment = String(body.department ?? '').trim();
  const departmentGroupId =
    typeof body.departmentGroupId === 'string' && body.departmentGroupId
      ? body.departmentGroupId
      : null;
  const extraBranches = Array.isArray(body.extraBranches)
    ? (body.extraBranches as string[])
    : [];
  const goLiveNow = Boolean(body.goLiveNow) && !usesSlotScheduling;
  const goLiveSlotNumbers = (Array.isArray(body.goLiveSlotNumbers) ? body.goLiveSlotNumbers : [])
    .map((n) => Math.floor(Number(n)))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 8);

  let questions = parseQuestionsJson(body.questions);

  if (isElevateX) {
    questions = ELEVATEX_PLACEHOLDER_QUESTIONS;
  } else if (!questions.length && def.requiresSyllabus) {
    if (!topicIds.length) {
      return NextResponse.json({ error: 'Select syllabus topics or provide questions' }, { status: 400 });
    }
    try {
      const drawn = await drawExamQuestionsFromTopics(admin, {
        testType,
        topicIds,
        questionsPerTopic,
        slotKey,
        createdBy: auth.ctx.user.id,
      });
      questions = drawn.questions;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Draw failed' },
        { status: 400 },
      );
    }
  }

  if (!questions.length) {
    return NextResponse.json({ error: 'No questions to publish' }, { status: 400 });
  }

  if (!targetYears.length) {
    return NextResponse.json({ error: 'Select at least one target year' }, { status: 400 });
  }

  const resolvedDept =
    primaryDepartment && primaryDepartment !== 'All departments'
      ? primaryDepartment
      : DEPARTMENTS[0];

  try {
    const result = await createFacultyExamRequestRecord(admin, {
      creatorUserId: auth.ctx.user.id,
      primaryDepartment: resolvedDept,
      title,
      description:
        typeof body.description === 'string'
          ? body.description
          : `${def.name} · ${slotKey}`,
      topic: def.name,
      targetYears,
      extraBranches,
      departmentGroupId,
      durationMinutes,
      questions,
      testType,
      slotKey,
      syllabusTopicIds: topicIds,
      questionsPerTopic,
      status: 'approved',
      autoPublish: true,
      autoGoLive: goLiveNow,
      goLiveNotice:
        typeof body.notice === 'string' ? body.notice : `${def.name} is now live for your group.`,
      usesSlotScheduling,
      scheduleSlots: usesSlotScheduling ? scheduleSlots : undefined,
      goLiveSlotNumbers: usesSlotScheduling ? goLiveSlotNumbers : undefined,
    });

    const goLiveMsg =
      goLiveSlotNumbers.length > 0
        ? ` ${goLiveSlotNumbers.length} slot(s) marked live (Slot ${goLiveSlotNumbers.join(', ')}).`
        : '';

    return NextResponse.json({
      requestId: result.requestId,
      testId: result.testId,
      scheduleId: result.scheduleId,
      takeUrl: result.testId ? studentTakeUrlForTestId(result.testId) : undefined,
      targetDepartments: [result.department, ...result.target_branches],
      message: usesSlotScheduling
        ? `Exam published with 8 slot schedules.${goLiveMsg} Go live remaining slots from Exam schedules when ready.`
        : goLiveNow
          ? 'Exam published and is live for the selected department group.'
          : 'Exam published. Go live from Exam schedules when ready.',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Publish failed' },
      { status: 500 },
    );
  }
}
