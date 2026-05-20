import type { SupabaseClient } from '@supabase/supabase-js';
import { syllabusUnitsForGroup, type SyllabusGroupKey } from '@/lib/exam-builder/syllabus';
import { looksLikeUuid } from '@/lib/exam-builder/id-utils';

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
  if (tagId && looksLikeUuid(tagId)) {
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
      const tagId = tag?.id != null ? String(tag.id) : null;
      const count = await countForSlug(admin, unit.slug, tagId ?? undefined);
      return {
        id: tagId && looksLikeUuid(tagId) ? tagId : unit.slug,
        slug: unit.slug,
        name: (tag?.name as string) ?? unit.name,
        question_count: count,
      };
    }),
  );
}
