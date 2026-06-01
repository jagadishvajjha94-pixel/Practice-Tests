import { NextRequest, NextResponse } from 'next/server';
import { getDbService } from '@/lib/db/get-db-service';

export async function GET(request: NextRequest) {
  try {
    const db = getDbService();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    let query = db.from('tests').select('*');

    if (categoryId) {
      const { data: category } = await db
        .from('test_categories')
        .select('id')
        .eq('slug', categoryId)
        .single();

      if (category) {
        query = query.eq('category_id', category.id);
      }
    }

    const { data: tests, error } = await query;

    if (error) throw error;

    return NextResponse.json(tests);
  } catch (error) {
    console.error('Error fetching tests:', error);
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
  }
}
