import { NextResponse } from 'next/server';
import { getDbService } from '@/lib/db/get-db-service';

export async function GET() {
  try {
    const db = getDbService();
    const { data, error } = await db
      .from('blog_posts')
      .select('*')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ posts: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load posts' },
      { status: 500 },
    );
  }
}
