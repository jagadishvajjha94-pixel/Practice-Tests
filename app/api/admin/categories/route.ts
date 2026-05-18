import { NextResponse } from 'next/server';
import { checkIsAdmin } from '@/lib/admin-verify';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';

const FALLBACK_CATEGORIES = [
  { id: 'fallback-quantitative', name: 'Quantitative Ability', slug: 'quantitative', description: null, icon: '📊', order: 1 },
  { id: 'fallback-verbal', name: 'Verbal Ability', slug: 'verbal', description: null, icon: '📖', order: 2 },
  { id: 'fallback-logical', name: 'Logical Reasoning', slug: 'logical', description: null, icon: '🧠', order: 3 },
  { id: 'fallback-coding', name: 'Coding / Programming', slug: 'coding', description: null, icon: '💻', order: 4 },
  { id: 'fallback-current-affairs', name: 'Current Affairs', slug: 'current-affairs', description: null, icon: '📰', order: 5 },
  { id: 'fallback-company', name: 'Company Specific', slug: 'company-specific', description: null, icon: '🏢', order: 6 },
  { id: 'fallback-psychometric', name: 'Psychometric Prep', slug: 'psychometric', description: null, icon: '🎭', order: 7 },
  { id: 'fallback-mock', name: 'Mock Interview Prep', slug: 'mock-interviews', description: null, icon: '🎤', order: 8 },
] as const;

export async function GET() {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const service = getServiceSupabase();
  if (!service) {
    return NextResponse.json({
      categories: FALLBACK_CATEGORIES,
      source: 'fallback',
      warning:
        'Using built-in categories. Run supabase/migrations/006_test_categories_and_exam_core.sql in Supabase SQL Editor, then NOTIFY pgrst, \'reload schema\';',
    });
  }

  const isAdmin = await checkIsAdmin(service, auth.ctx.resolved.id, auth.ctx.resolved.email);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await service
    .from('test_categories')
    .select('id, name, slug, description, icon, order, created_at')
    .order('name', { ascending: true });

  if (error || !data?.length) {
    return NextResponse.json({
      categories: FALLBACK_CATEGORIES,
      source: 'fallback',
      warning:
        error?.message ??
        'No categories in database. Run supabase/migrations/006_test_categories_and_exam_core.sql in Supabase SQL Editor.',
    });
  }

  return NextResponse.json({ categories: data, source: 'database' });
}
