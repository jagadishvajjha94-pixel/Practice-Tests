import { NextResponse } from 'next/server';
import { getDbService } from '@/lib/db/get-db-service';

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const db = getDbService();
    const { data, error } = await db
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ post: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load post' },
      { status: 500 },
    );
  }
}
