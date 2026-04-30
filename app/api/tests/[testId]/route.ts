import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { testId: string } }
) {
  try {
    const testId = params.testId;

    // Fetch test details
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testError) throw testError;

    // Fetch test questions with question details
    const { data: testQuestions, error: questionsError } = await supabase
      .from('test_questions')
      .select(
        `
        id,
        order,
        question:questions(*)
      `
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
    return NextResponse.json(
      { error: 'Failed to fetch test' },
      { status: 500 }
    );
  }
}
