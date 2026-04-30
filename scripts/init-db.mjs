#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const postgresUrl = process.env.POSTGRES_URL;

if (!supabaseUrl || !serviceRoleKey || !postgresUrl) {
  console.error('❌ Missing environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, POSTGRES_URL');
  process.exit(1);
}

async function initializeDatabase() {
  console.log('🚀 Initializing PrepIndia Database Schema...\n');

  try {
    // Use direct PostgreSQL connection
    const sql = postgres(postgresUrl, {
      ssl: 'require',
    });

    console.log('✅ Connected to PostgreSQL\n');

    // Create extension
    console.log('📦 Creating UUID extension...');
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    console.log('✅ UUID extension created\n');

    // Create users table
    console.log('📝 Creating users table...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        phone TEXT,
        subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium', 'cancelled')),
        subscription_end_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ users table created\n');

    // Create test_categories table
    console.log('📝 Creating test_categories table...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.test_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        icon TEXT,
        "order" INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ test_categories table created\n');

    // Create questions table
    console.log('📝 Creating questions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.questions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        category_id UUID NOT NULL REFERENCES public.test_categories(id) ON DELETE CASCADE,
        difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
        question_text TEXT NOT NULL,
        type TEXT CHECK (type IN ('MCQ', 'numeric', 'verbal')) DEFAULT 'MCQ',
        options JSONB,
        correct_answer TEXT NOT NULL,
        explanation TEXT,
        tags JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ questions table created\n');

    // Create tests table
    console.log('📝 Creating tests table...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.tests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        category_id UUID NOT NULL REFERENCES public.test_categories(id) ON DELETE CASCADE,
        duration INTEGER NOT NULL DEFAULT 60,
        total_questions INTEGER NOT NULL,
        passing_score INTEGER,
        description TEXT,
        difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
        is_paid BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ tests table created\n');

    // Create test_questions table
    console.log('📝 Creating test_questions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.test_questions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
        question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
        "order" INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(test_id, question_id)
      )
    `;
    console.log('✅ test_questions table created\n');

    // Create test_attempts table
    console.log('📝 Creating test_attempts table...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.test_attempts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        score NUMERIC(5, 2),
        answers JSONB,
        time_taken INTEGER,
        status TEXT CHECK (status IN ('in_progress', 'completed', 'abandoned')) DEFAULT 'in_progress',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ test_attempts table created\n');

    // Create test_answers table
    console.log('📝 Creating test_answers table...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.test_answers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
        question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
        user_answer TEXT,
        is_correct BOOLEAN,
        time_spent INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ test_answers table created\n');

    // Create blog_posts table
    console.log('📝 Creating blog_posts table...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.blog_posts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        author TEXT,
        category TEXT,
        featured_image TEXT,
        tags JSONB,
        published_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ blog_posts table created\n');

    // Create admin_users table
    console.log('📝 Creating admin_users table...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.admin_users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        role TEXT CHECK (role IN ('admin', 'moderator')) DEFAULT 'admin',
        permissions JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `;
    console.log('✅ admin_users table created\n');

    // Create payment_records table
    console.log('📝 Creating payment_records table...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.payment_records (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT,
        amount NUMERIC(10, 2),
        currency TEXT DEFAULT 'INR',
        status TEXT CHECK (status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
        plan_type TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ payment_records table created\n');

    // Enable RLS
    console.log('🔒 Enabling Row Level Security...');
    await sql`ALTER TABLE public.users ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE public.test_answers ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY`;
    console.log('✅ RLS enabled\n');

    // Create RLS policies
    console.log('📋 Creating RLS policies...');
    
    await sql`CREATE POLICY IF NOT EXISTS "Users can view own profile" ON public.users
      FOR SELECT USING (auth.uid() = id)`;
    
    await sql`CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.users
      FOR UPDATE USING (auth.uid() = id)`;
    
    await sql`CREATE POLICY IF NOT EXISTS "Users can view own attempts" ON public.test_attempts
      FOR SELECT USING (auth.uid() = user_id)`;
    
    await sql`CREATE POLICY IF NOT EXISTS "Users can insert own attempts" ON public.test_attempts
      FOR INSERT WITH CHECK (auth.uid() = user_id)`;
    
    await sql`CREATE POLICY IF NOT EXISTS "Users can update own attempts" ON public.test_attempts
      FOR UPDATE USING (auth.uid() = user_id)`;
    
    await sql`CREATE POLICY IF NOT EXISTS "Users can view own answers" ON public.test_answers
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.test_attempts
          WHERE test_attempts.id = test_answers.attempt_id
          AND test_attempts.user_id = auth.uid()
        )
      )`;
    
    await sql`CREATE POLICY IF NOT EXISTS "Users can insert own answers" ON public.test_answers
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.test_attempts
          WHERE test_attempts.id = test_answers.attempt_id
          AND test_attempts.user_id = auth.uid()
        )
      )`;
    
    await sql`CREATE POLICY IF NOT EXISTS "Everyone can view questions" ON public.questions FOR SELECT USING (true)`;
    await sql`CREATE POLICY IF NOT EXISTS "Everyone can view categories" ON public.test_categories FOR SELECT USING (true)`;
    await sql`CREATE POLICY IF NOT EXISTS "Everyone can view tests" ON public.tests FOR SELECT USING (true)`;
    await sql`CREATE POLICY IF NOT EXISTS "Everyone can view test_questions" ON public.test_questions FOR SELECT USING (true)`;
    
    await sql`CREATE POLICY IF NOT EXISTS "Everyone can view blog posts" ON public.blog_posts
      FOR SELECT USING (published_at IS NOT NULL)`;
    
    await sql`CREATE POLICY IF NOT EXISTS "Users can view own payments" ON public.payment_records
      FOR SELECT USING (auth.uid() = user_id)`;
    
    await sql`CREATE POLICY IF NOT EXISTS "Users can insert own payments" ON public.payment_records
      FOR INSERT WITH CHECK (auth.uid() = user_id)`;
    
    console.log('✅ RLS policies created\n');

    // Insert sample test categories
    console.log('📝 Inserting sample test categories...');
    const categories = [
      { name: 'Quantitative', slug: 'quantitative', description: 'Quantitative Aptitude Questions' },
      { name: 'Verbal', slug: 'verbal', description: 'English & Verbal Ability' },
      { name: 'Logical', slug: 'logical', description: 'Logical Reasoning' },
      { name: 'Coding', slug: 'coding', description: 'Programming & Coding' },
      { name: 'Companies', slug: 'companies', description: 'Company-specific Tests' },
      { name: 'Psychometric', slug: 'psychometric', description: 'Psychometric Tests' },
      { name: 'Current Affairs', slug: 'current-affairs', description: 'Current Affairs & GK' },
      { name: 'Mock Interviews', slug: 'mock-interviews', description: 'Mock Interviews' },
    ];

    for (const category of categories) {
      await sql`
        INSERT INTO public.test_categories (name, slug, description)
        VALUES (${category.name}, ${category.slug}, ${category.description})
        ON CONFLICT (slug) DO NOTHING
      `;
    }
    console.log(`✅ Inserted ${categories.length} test categories\n`);

    // Insert sample questions and tests
    console.log('📝 Inserting sample questions and tests...');
    
    const quantSlug = 'quantitative';
    const { data: quantCat } = await sql`
      SELECT id FROM public.test_categories WHERE slug = ${quantSlug} LIMIT 1
    `;

    if (quantCat && quantCat.length > 0) {
      const catId = quantCat[0].id;

      // Insert sample questions
      const sampleQuestions = [
        {
          question_text: 'What is 15% of 200?',
          type: 'MCQ',
          difficulty: 'easy',
          options: JSON.stringify(['30', '40', '50', '60']),
          correct_answer: '30',
          explanation: '15% of 200 = (15/100) × 200 = 30',
        },
        {
          question_text: 'Solve: 2x + 5 = 13',
          type: 'numeric',
          difficulty: 'easy',
          options: JSON.stringify(null),
          correct_answer: '4',
          explanation: '2x = 13 - 5 = 8, so x = 4',
        },
        {
          question_text: 'The average of four numbers is 25. If three of them are 20, 25, and 30, what is the fourth number?',
          type: 'MCQ',
          difficulty: 'medium',
          options: JSON.stringify(['20', '25', '30', '35']),
          correct_answer: '25',
          explanation: 'Sum = 4 × 25 = 100. Fourth number = 100 - 20 - 25 - 30 = 25',
        },
        {
          question_text: 'If a train travels 120 km in 2 hours, what is its average speed?',
          type: 'numeric',
          difficulty: 'easy',
          options: JSON.stringify(null),
          correct_answer: '60',
          explanation: 'Speed = Distance / Time = 120 / 2 = 60 km/h',
        },
        {
          question_text: 'What is the compound interest on ₹1000 at 10% per annum for 2 years?',
          type: 'MCQ',
          difficulty: 'hard',
          options: JSON.stringify(['₹100', '₹210', '₹221', '₹310']),
          correct_answer: '₹210',
          explanation: 'CI = 1000(1.1)² - 1000 = 1210 - 1000 = 210',
        },
      ];

      for (const q of sampleQuestions) {
        await sql`
          INSERT INTO public.questions (category_id, question_text, type, difficulty, options, correct_answer, explanation)
          VALUES (${catId}, ${q.question_text}, ${q.type}, ${q.difficulty}, ${q.options}, ${q.correct_answer}, ${q.explanation})
        `;
      }
      console.log(`✅ Inserted ${sampleQuestions.length} sample questions\n`);
    }

    await sql.end();
    console.log('✅ Database initialization completed successfully!\n');
    console.log('🎉 Your PrepIndia database is ready to use!');
    console.log('   Users can now sign up and start taking tests.\n');

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

initializeDatabase();
