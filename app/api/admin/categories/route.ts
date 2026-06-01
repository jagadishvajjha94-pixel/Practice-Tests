import { NextResponse } from 'next/server';
import { getDbService } from '@/lib/db/get-db-service';
import { checkIsAdmin } from '@/lib/admin-verify';
import { requireAuth } from '@/lib/server-auth';
import { fetchTestCategories } from '@/lib/db-catalog-queries';

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

const RDS_SETUP_HINT =
  'Run prisma db push or scripts/01-initial-schema.sql on RDS. Ensure DATABASE_URL includes ?sslmode=require.';

export async function GET() {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const service = getDbService();
  if (!service) {
    return NextResponse.json({
      categories: FALLBACK_CATEGORIES,
      source: 'fallback',
      warning: `Using built-in categories. ${RDS_SETUP_HINT}`,
    });
  }

  const isAdmin = await checkIsAdmin(service, auth.ctx.resolved.id, auth.ctx.resolved.email);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { categories, error } = await fetchTestCategories(service);

  if (error || !categories.length) {
    return NextResponse.json({
      categories: FALLBACK_CATEGORIES,
      source: 'fallback',
      warning: error ?? `No categories in database. ${RDS_SETUP_HINT}`,
    });
  }

  return NextResponse.json({ categories, source: 'database' });
}
