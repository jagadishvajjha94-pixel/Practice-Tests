import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import {
  loadQuestionBankOverview,
  loadQuestionsForTopic,
  type QuestionBankRow,
} from '@/lib/admin/question-bank-catalog';

export const dynamic = 'force-dynamic';

function escapeCsv(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function questionsToCsv(rows: QuestionBankRow[], topicName: string, sectionName: string): string {
  const lines: string[] = [];
  lines.push('Section,Topic,Question ID,Question,Option A,Option B,Option C,Option D,Correct,Difficulty,Type,Explanation,Tags');
  for (const q of rows) {
    const optA = q.option_a ?? q.options?.[0] ?? '';
    const optB = q.option_b ?? q.options?.[1] ?? '';
    const optC = q.option_c ?? q.options?.[2] ?? '';
    const optD = q.option_d ?? q.options?.[3] ?? '';
    lines.push(
      [
        escapeCsv(sectionName),
        escapeCsv(topicName),
        escapeCsv(q.id),
        escapeCsv(q.question_text),
        escapeCsv(optA),
        escapeCsv(optB),
        escapeCsv(optC),
        escapeCsv(optD),
        escapeCsv(q.correct_answer),
        escapeCsv(q.difficulty),
        escapeCsv(q.type),
        escapeCsv(q.explanation ?? ''),
        escapeCsv((q.tags ?? []).join('|')),
      ].join(','),
    );
  }
  return lines.join('\n');
}

export async function GET(request: Request) {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const topicSlug = searchParams.get('topicSlug')?.trim() ?? '';
  const exportFormat = searchParams.get('export')?.trim() ?? '';
  const offset = Math.max(0, Number(searchParams.get('offset') ?? 0) || 0);
  const limit = Math.min(Math.max(1, Number(searchParams.get('limit') ?? 100) || 100), 500);

  try {
    if (!topicSlug) {
      const overview = await loadQuestionBankOverview(admin);
      return NextResponse.json(overview);
    }

    if (exportFormat === 'csv') {
      const allRows: QuestionBankRow[] = [];
      let pageOffset = 0;
      const pageSize = 500;
      let topicName = topicSlug;
      let total = 0;
      for (;;) {
        const batch = await loadQuestionsForTopic(admin, topicSlug, {
          offset: pageOffset,
          limit: pageSize,
        });
        if (!batch.topic) {
          return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
        }
        topicName = batch.topic.name;
        total = batch.total;
        allRows.push(...batch.questions);
        if (allRows.length >= total || batch.questions.length < pageSize) break;
        pageOffset += pageSize;
      }

      const overview = await loadQuestionBankOverview(admin);
      const section = overview.sections.find((s) =>
        s.topics.some((t) => t.slug === topicSlug),
      );
      const csv = questionsToCsv(
        allRows,
        topicName,
        section?.name ?? 'Question bank',
      );
      const slugPart = topicSlug.replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="question-bank-${slugPart}.csv"`,
        },
      });
    }

    const payload = await loadQuestionsForTopic(admin, topicSlug, { offset, limit });
    if (!payload.topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load question bank';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
