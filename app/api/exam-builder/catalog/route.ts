import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import {
  EXAM_BUILDER_SLOTS,
  EXAM_BUILDER_TEST_TYPES,
  getExamBuilderTestType,
} from '@/lib/exam-builder/test-catalog';
import { syllabusUnitsForGroup, type SyllabusGroupKey } from '@/lib/exam-builder/syllabus';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function countForSlug(
  admin: NonNullable<ReturnType<typeof getServiceSupabase>>,
  slug: string,
  tagId?: string,
): Promise<number> {
  if (tagId && UUID_RE.test(tagId)) {
    const { count, error } = await admin
      .from('question_tag_links')
      .select('*', { count: 'exact', head: true })
      .eq('tag_id', tagId);
    if (!error && count != null && count > 0) return count;
  }

  const { count, error } = await admin
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .contains('tags', [slug]);

  if (error) return 0;
  return count ?? 0;
}

export async function GET() {
  const auth = await requireAuth(['admin', 'faculty']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ testTypes: EXAM_BUILDER_TEST_TYPES, slots: EXAM_BUILDER_SLOTS, topics: [] });
  }

  const { data: allTags } = await admin.from('question_tags').select('id, name, slug').order('name');
  const tagBySlug = new Map((allTags ?? []).map((t) => [t.slug as string, t]));

  const syllabusByTestType: Record<string, Array<{ id: string; slug: string; name: string; question_count: number }>> = {};

  for (const testType of EXAM_BUILDER_TEST_TYPES) {
    if (!testType.syllabusGroup) continue;

    if (testType.syllabusGroup === 'rmset') {
      syllabusByTestType[testType.id] = await Promise.all(
        (allTags ?? []).map(async (t) => ({
          id: t.id as string,
          slug: t.slug as string,
          name: t.name as string,
          question_count: await countForSlug(admin, t.slug as string, t.id as string),
        })),
      );
      continue;
    }

    const units = syllabusUnitsForGroup(testType.syllabusGroup as SyllabusGroupKey);
    const topics = await Promise.all(
      units.map(async (unit) => {
        const tag = tagBySlug.get(unit.slug);
        const count = await countForSlug(admin, unit.slug, tag?.id as string | undefined);
        return {
          id: (tag?.id as string) ?? unit.slug,
          slug: unit.slug,
          name: unit.name,
          question_count: count,
        };
      }),
    );
    syllabusByTestType[testType.id] = topics;
  }

  return NextResponse.json({
    testTypes: EXAM_BUILDER_TEST_TYPES,
    slots: EXAM_BUILDER_SLOTS,
    syllabusByTestType,
  });
}
