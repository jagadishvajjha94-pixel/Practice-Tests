import type { SupabaseClient } from '@supabase/supabase-js';

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  order: number | null;
  created_at: string | null;
};

export type CatalogTest = {
  id: string;
  name: string;
  category_id: string;
};

function isMissingColumnError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('does not exist') || m.includes('schema cache');
}

/** Load categories without assuming optional columns like "order" exist. */
export async function fetchTestCategories(
  client: SupabaseClient,
): Promise<{ categories: CatalogCategory[]; error?: string }> {
  const selectAttempts = [
    'id, name, slug, description, icon, created_at',
    'id, name, slug, description, icon',
    'id, name, slug',
  ];

  for (const columns of selectAttempts) {
    const { data, error } = await client
      .from('test_categories')
      .select(columns)
      .order('name', { ascending: true });

    if (!error) {
      const categories = (data ?? []).map((row, index) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.id),
          name: String(r.name ?? ''),
          slug: String(r.slug ?? ''),
          description: (r.description as string | null) ?? null,
          icon: (r.icon as string | null) ?? null,
          order: typeof r.order === 'number' ? r.order : index + 1,
          created_at: (r.created_at as string | null) ?? null,
        };
      });
      return { categories };
    }

    if (!isMissingColumnError(String(error.message ?? ''))) {
      return { categories: [], error: error.message };
    }
  }

  return { categories: [], error: 'Could not load test_categories' };
}

/** Load tests using title or legacy name column. */
export async function fetchTestsCatalog(
  client: SupabaseClient,
): Promise<{ tests: CatalogTest[]; error?: string }> {
  const selectAttempts = ['id, title, category_id', 'id, name, category_id', 'id, category_id'];

  for (const columns of selectAttempts) {
    const { data, error } = await client.from('tests').select(columns);
    if (!error) {
      const tests = (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        const label =
          (r.title as string | undefined) ??
          (r.name as string | undefined) ??
          `Test ${String(r.id)}`;
        return {
          id: String(r.id),
          name: label,
          category_id: String(r.category_id ?? ''),
        };
      });
      return { tests };
    }

    if (!isMissingColumnError(String(error.message ?? ''))) {
      return { tests: [], error: error.message };
    }
  }

  return { tests: [], error: 'Could not load tests' };
}
