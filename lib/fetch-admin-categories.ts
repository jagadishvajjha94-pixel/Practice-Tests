import {
  DEFAULT_CATEGORY_OPTIONS,
  type CategoryOption,
} from '@/lib/ai-generator-config';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

export async function fetchAdminCategories(): Promise<{
  categories: CategoryOption[];
  warning?: string;
}> {
  try {
    const res = await fetchWithAuth('/api/admin/categories', { cache: 'no-store' });
    const json = (await res.json()) as {
      categories?: CategoryOption[];
      warning?: string;
      error?: string;
    };
    if (res.ok && json.categories?.length) {
      return { categories: json.categories, warning: json.warning };
    }
    return {
      categories: DEFAULT_CATEGORY_OPTIONS,
      warning:
        json.error ??
        json.warning ??
        'Using built-in categories. Run supabase/migrations/006_test_categories_and_exam_core.sql in Supabase SQL Editor.',
    };
  } catch {
    return {
      categories: DEFAULT_CATEGORY_OPTIONS,
      warning: 'Could not load categories from server. Using built-in list.',
    };
  }
}
