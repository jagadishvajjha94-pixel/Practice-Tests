import type { SupabaseClient } from '@supabase/supabase-js';
import { syllabusUnitsForGroup, type SyllabusGroupKey } from '@/lib/exam-builder/syllabus';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SyllabusCatalogTopic = {
  id: string;
  slug: string;
  name: string;
  question_count: number;
};

async function countForSlug(
  admin: SupabaseClient,
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

/** Build syllabus picker options for a test type with live bank counts. */
export async function buildSyllabusCatalogForGroup(
  admin: SupabaseClient,
  group: SyllabusGroupKey,
): Promise<SyllabusCatalogTopic[]> {
  const units = syllabusUnitsForGroup(group);
  const { data: allTags } = await admin.from('question_tags').select('id, name, slug').order('name');
  const tagBySlug = new Map((allTags ?? []).map((t) => [t.slug as string, t]));

  return Promise.all(
    units.map(async (unit) => {
      const tag = tagBySlug.get(unit.slug);
      const count = await countForSlug(admin, unit.slug, tag?.id as string | undefined);
      return {
        id: (tag?.id as string) ?? unit.slug,
        slug: unit.slug,
        name: (tag?.name as string) ?? unit.name,
        question_count: count,
      };
    }),
  );
}
