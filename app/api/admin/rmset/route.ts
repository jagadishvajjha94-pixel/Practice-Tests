import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { publishRmsetPaper } from '@/lib/rmset/publish-paper';
import type { RmsetPaperWithTopics, RmsetTopic } from '@/lib/rmset/types';

async function countQuestionsForTag(
  admin: NonNullable<ReturnType<typeof getServiceSupabase>>,
  tagId: string,
  tagSlug: string,
): Promise<number> {
  const ids = new Set<string>();

  const { data: links } = await admin
    .from('question_tag_links')
    .select('question_id')
    .eq('tag_id', tagId);

  for (const row of links ?? []) {
    if (row.question_id) ids.add(row.question_id as string);
  }

  const { data: rows } = await admin.from('questions').select('id, tags');
  for (const row of rows ?? []) {
    const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
    if (tags.some((t) => t === tagSlug || t === tagId)) {
      ids.add(row.id as string);
    }
  }

  return ids.size;
}

export async function GET() {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const { data: tagRows } = await admin
    .from('question_tags')
    .select('id, name, slug')
    .order('name');

  const topics: RmsetTopic[] = [];
  for (const tag of tagRows ?? []) {
    topics.push({
      id: tag.id as string,
      name: tag.name as string,
      slug: tag.slug as string,
      question_count: await countQuestionsForTag(admin, tag.id as string, tag.slug as string),
    });
  }

  const { data: papers } = await admin
    .from('rmset_papers')
    .select('*')
    .order('updated_at', { ascending: false });

  const tagMap = new Map(topics.map((t) => [t.id, t]));
  const enriched: RmsetPaperWithTopics[] = (papers ?? []).map((p) => {
    const topicIds = (p.topic_ids ?? []) as string[];
    const selected = topicIds.map((id) => tagMap.get(id)).filter(Boolean) as RmsetTopic[];
    return {
      ...(p as RmsetPaperWithTopics),
      topics: selected,
      total_questions: topicIds.length * (p.questions_per_topic as number),
    };
  });

  return NextResponse.json({ topics, papers: enriched });
}

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

  const topicIds = Array.isArray(body.topicIds) ? (body.topicIds as string[]) : [];
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  try {
    const result = await publishRmsetPaper(admin, {
      title,
      description: typeof body.description === 'string' ? body.description : undefined,
      topicIds,
      questionsPerTopic: Number(body.questionsPerTopic) || 10,
      durationMinutes: Number(body.durationMinutes) || 60,
      createdBy: auth.ctx.user.id,
      paperId: typeof body.paperId === 'string' ? body.paperId : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Publish failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
