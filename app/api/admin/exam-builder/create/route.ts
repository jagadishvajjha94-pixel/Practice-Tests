import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { parseQuestionsJson } from '@/lib/faculty-exams';
import { getExamBuilderTestType } from '@/lib/exam-builder/test-catalog';
import { drawExamQuestionsFromTopics } from '@/lib/exam-builder/draw-questions';
import { publishSyllabusExam } from '@/lib/exam-builder/publish-syllabus-test';
import { isValidAcademicYear } from '@/lib/roles';
import { ACADEMIC_YEARS } from '@/lib/college-brand';

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

  const title = String(body.title ?? '').trim() || `${def.name} Examination`;
  const slotKey = String(body.slotKey ?? 'slot-1');
  const topicIds = Array.isArray(body.topicIds) ? (body.topicIds as string[]) : [];
  const questionsPerTopic = Number(body.questionsPerTopic) || def.defaultQuestionsPerTopic;
  const durationMinutes = Number(body.durationMinutes) || def.defaultDurationMinutes;
  const targetYears = (Array.isArray(body.targetYears) ? body.targetYears : []).filter((y) =>
    isValidAcademicYear(String(y)),
  );
  const department = String(body.department ?? 'All departments').trim();

  let questions = parseQuestionsJson(body.questions);

  if (!questions.length && def.requiresSyllabus) {
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

  try {
    const { testId } = await publishSyllabusExam(admin, {
      title,
      description:
        typeof body.description === 'string'
          ? body.description
          : `${def.name} · ${slotKey} · ${targetYears.length ? targetYears.join(', ') : 'All years'}`,
      durationMinutes,
      questions,
      testType,
    });

    return NextResponse.json({
      testId,
      takeUrl: `/tests/take/${testId}`,
      message: 'Exam published. Schedule it live via Evalora modules or Faculty exam schedules.',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Publish failed' },
      { status: 500 },
    );
  }
}
