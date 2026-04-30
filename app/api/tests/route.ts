import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || url.includes('YOUR_') || serviceKey.includes('YOUR_')) {
    return null;
  }
  return createClient(url, serviceKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      );
    }

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
