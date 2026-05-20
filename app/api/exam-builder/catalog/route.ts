import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import {
  EXAM_BUILDER_SLOTS,
  EXAM_BUILDER_TEST_TYPES,
  getExamBuilderTestType,
} from '@/lib/exam-builder/test-catalog';
import { syllabusUnitsForGroup, type SyllabusGroupKey } from '@/lib/exam-builder/syllabus';

async function countForSlug(
  admin: NonNullable<ReturnType<typeof getServiceSupabase>>,
  slug: string,
  tagId?: string,
): Promise<number> {
  const ids = new Set<string>();
  if (tagId) {
    const { data: links } = await admin
      .from('question_tag_links')
      .select('question_id')
      .eq('tag_id', tagId);
    for (const row of links ?? []) {
      if (row.question_id) ids.add(row.question_id as string);
    }
  }
  const { data: rows } = await admin.from('questions').select('id, tags');
  for (const row of rows ?? []) {
    const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
    if (tags.includes(slug) || (tagId && tags.includes(tagId))) {
      ids.add(row.id as string);
    }
  }
  return ids.size;
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
