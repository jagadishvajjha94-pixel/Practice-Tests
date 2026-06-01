import { NextRequest, NextResponse } from 'next/server';
import { getDbService } from '@/lib/db/get-db-service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  try {
    const { testId } = await params;
    const db = getDbService();

    const { data: test, error: testError } = await db
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testError) throw testError;

    const { data: testQuestions, error: questionsError } = await db
      .from('test_questions')
      .select(
        `
        id,
        order,
        question:questions(*)
      `,
      )
      .eq('test_id', testId)
      .order('order', { ascending: true });

    if (questionsError) throw questionsError;

    return NextResponse.json({
      ...test,
      questions: testQuestions,
    });
  } catch (error) {
    console.error('Error fetching test:', error);
    return NextResponse.json({ error: 'Failed to fetch test' }, { status: 500 });
  }
}
