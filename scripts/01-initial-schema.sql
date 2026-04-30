-- PrepIndia Database Schema
-- This script creates all the necessary tables for the PrepIndia platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium', 'cancelled')),
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Categories table
CREATE TABLE IF NOT EXISTS public.test_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  "order" INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions table
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
);

-- Tests table (predefined test sets)
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
);

-- Test Questions mapping (many-to-many)
CREATE TABLE IF NOT EXISTS public.test_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(test_id, question_id)
);

-- Test Attempts table (user submissions)
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
);

-- Test Answers table (individual answer details)
CREATE TABLE IF NOT EXISTS public.test_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_answer TEXT,
  is_correct BOOLEAN,
  time_spent INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blog Posts table
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
);

-- Admin Users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'moderator')) DEFAULT 'admin',
  permissions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Payment Records table
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
);

-- Row Level Security Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Users can view their own test attempts
CREATE POLICY "Users can view own attempts" ON public.test_attempts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own test attempts
CREATE POLICY "Users can insert own attempts" ON public.test_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own test attempts
CREATE POLICY "Users can update own attempts" ON public.test_attempts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can view their own test answers
CREATE POLICY "Users can view own answers" ON public.test_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.test_attempts
      WHERE test_attempts.id = test_answers.attempt_id
      AND test_attempts.user_id = auth.uid()
    )
  );

-- Users can insert their own test answers
CREATE POLICY "Users can insert own answers" ON public.test_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.test_attempts
      WHERE test_attempts.id = test_answers.attempt_id
      AND test_attempts.user_id = auth.uid()
    )
  );

-- Everyone can view public questions, categories, and tests
CREATE POLICY "Everyone can view questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Everyone can view categories" ON public.test_categories FOR SELECT USING (true);
CREATE POLICY "Everyone can view tests" ON public.tests FOR SELECT USING (true);
CREATE POLICY "Everyone can view test_questions" ON public.test_questions FOR SELECT USING (true);

-- Everyone can view published blog posts
CREATE POLICY "Everyone can view blog posts" ON public.blog_posts
  FOR SELECT USING (published_at IS NOT NULL);

-- Users can view their own payment records
CREATE POLICY "Users can view own payments" ON public.payment_records
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own payment records
CREATE POLICY "Users can insert own payments" ON public.payment_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin users can access admin panel (checked in application code)
-- CREATE POLICY "Admins can view all users" ON public.users FOR SELECT USING (
--   EXISTS (
--     SELECT 1 FROM public.admin_users
--     WHERE admin_users.user_id = auth.uid()
--   )
-- );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON public.questions(category_id);
CREATE INDEX IF NOT EXISTS idx_tests_category_id ON public.tests(category_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON public.test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_question_id ON public.test_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_user_id ON public.test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_id ON public.test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_test_answers_attempt_id ON public.test_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_test_answers_question_id ON public.test_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_user_id ON public.payment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);

-- Seed Test Categories
INSERT INTO public.test_categories (name, slug, description, icon, "order") VALUES
('Quantitative Aptitude', 'quantitative', 'Math, logic, and numerical reasoning tests', '📊', 1),
('Verbal Ability', 'verbal', 'English, reading comprehension, and communication tests', '📖', 2),
('Logical Reasoning', 'logical', 'Problem solving and logical deduction tests', '🧠', 3),
('Current Affairs', 'current-affairs', 'News, events, and general knowledge', '📰', 4),
('Company Specific', 'company-specific', 'TCS, Infosys, HCL, and other company tests', '🏢', 5),
('Coding Challenges', 'coding', 'Programming and algorithm problems', '💻', 6),
('Psychometric Tests', 'psychometric', 'Personality and behavioral assessments', '🎭', 7),
('Mock Interviews', 'mock-interviews', 'Practice interviews with AI', '🎤', 8)
ON CONFLICT DO NOTHING;

-- Seed Sample Blog Posts
INSERT INTO public.blog_posts (title, slug, content, author, category, tags, published_at) VALUES
(
  'How to Crack Aptitude Tests',
  'how-to-crack-aptitude-tests',
  '# How to Crack Aptitude Tests\n\nAptitude tests are crucial for placement success. Here are proven strategies:\n\n1. **Practice Regularly** - Solve at least 2-3 hours daily\n2. **Learn Shortcuts** - Master mathematical tricks and shortcuts\n3. **Improve Speed** - Work on time management\n4. **Mock Tests** - Take full-length mock tests weekly\n5. **Analyze Mistakes** - Review wrong answers carefully\n\nWith consistent effort and the right approach, you can definitely crack these tests!',
  'PrepIndia Team',
  'Placement',
  '["aptitude", "preparation", "tips"]',
  NOW()
),
(
  'Top Companies Hiring 2024',
  'top-companies-hiring-2024',
  '# Top Companies Hiring in 2024\n\nHere are some of the top companies actively recruiting:\n\n- TCS\n- Infosys\n- HCL Technologies\n- Wipro\n- Accenture\n- Amazon\n- Microsoft\n- Google\n\nEach company has specific requirements. Check their job portals for latest openings.',
  'PrepIndia Team',
  'Recruitment',
  '["jobs", "companies", "2024"]',
  NOW()
),
(
  'Mock Interview Tips',
  'mock-interview-tips',
  '# Mock Interview Tips for Success\n\n## Before the Interview\n- Research the company thoroughly\n- Prepare your introduction and background\n- Practice common questions\n- Dress professionally\n\n## During the Interview\n- Speak clearly and confidently\n- Listen carefully to questions\n- Answer with relevant examples\n- Ask thoughtful questions\n\n## After the Interview\n- Send a thank you email\n- Follow up appropriately\n- Reflect on your performance\n\nSuccess comes with practice!',
  'PrepIndia Team',
  'Interview',
  '["interview", "tips", "success"]',
  NOW()
)
ON CONFLICT DO NOTHING;
