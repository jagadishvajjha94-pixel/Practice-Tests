import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const isSupabaseConfigured =
  !!supabaseUrl &&
  !!serviceRoleKey &&
  supabaseUrl.includes('.supabase.co') &&
  !supabaseUrl.includes('YOUR_') &&
  !serviceRoleKey.includes('YOUR_');

export async function GET() {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({
        status: 'config_missing',
        message: 'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local',
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if we can connect to the database
    const { data, error } = await supabase
      .from('test_categories')
      .select('id')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      // Tables don't exist yet
      return NextResponse.json({
        status: 'uninitialized',
        message: 'Database not initialized',
        setupUrl: '/setup',
      });
    }

    if (error) {
      return NextResponse.json({
        status: 'error',
        message: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'healthy',
      message: 'Database is initialized and working',
      tables: [
        'users',
        'test_categories',
        'tests',
        'questions',
        'test_attempts',
        'question_answers',
        'blog_posts',
        'payments',
      ],
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
