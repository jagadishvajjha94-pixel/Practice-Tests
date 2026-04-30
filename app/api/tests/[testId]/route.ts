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

export async function GET(
  request: NextRequest,
  { params }: { params: { testId: string } }
) {
  try {
    const testId = params.testId;
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      );
    }

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
