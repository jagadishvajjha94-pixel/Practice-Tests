import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    let query = supabase.from('tests').select('*');

    if (categoryId) {
      // Get category by slug first
      const { data: category } = await supabase
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
    return NextResponse.json(
      { error: 'Failed to fetch tests' },
      { status: 500 }
    );
  }
}
