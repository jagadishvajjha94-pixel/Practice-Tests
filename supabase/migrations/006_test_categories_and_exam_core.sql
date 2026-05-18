-- Core exam tables: test_categories (+ patch existing questions/tests)
-- Safe to re-run in Supabase SQL Editor (idempotent).
-- Run AFTER 004_users_and_admin_setup.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== test_categories (create only if missing) ==========
CREATE TABLE IF NOT EXISTS public.test_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  "order" INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraints (ignore if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'test_categories_slug_key' AND conrelid = 'public.test_categories'::regclass
  ) THEN
    ALTER TABLE public.test_categories ADD CONSTRAINT test_categories_slug_key UNIQUE (slug);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'test_categories_name_key' AND conrelid = 'public.test_categories'::regclass
  ) THEN
    ALTER TABLE public.test_categories ADD CONSTRAINT test_categories_name_key UNIQUE (name);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_test_categories_slug ON public.test_categories(slug);

-- Patch legacy test_categories (init-db used test_count, not "order")
ALTER TABLE public.test_categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.test_categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.test_categories ADD COLUMN IF NOT EXISTS "order" INTEGER;
ALTER TABLE public.test_categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.test_categories ADD COLUMN IF NOT EXISTS test_count INT DEFAULT 0;

-- Copy test_count into "order" when order was missing
UPDATE public.test_categories
SET "order" = test_count
WHERE "order" IS NULL AND test_count IS NOT NULL;

-- Helper: category id column type (uuid vs bigint legacy)
DO $$
DECLARE
  cat_type TEXT;
BEGIN
  SELECT c.data_type INTO cat_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'test_categories'
    AND c.column_name = 'id';

  IF cat_type IS NULL THEN
    RAISE EXCEPTION 'test_categories.id column missing';
  END IF;

  -- ========== questions: create or patch ==========
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'questions'
  ) THEN
    IF cat_type = 'uuid' THEN
      EXECUTE $q$
        CREATE TABLE public.questions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          category_id UUID REFERENCES public.test_categories(id) ON DELETE SET NULL,
          test_id UUID,
          difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
          question_text TEXT NOT NULL,
          type TEXT DEFAULT 'MCQ',
          options JSONB,
          correct_answer TEXT NOT NULL,
          explanation TEXT,
          tags JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      $q$;
    ELSE
      EXECUTE $q$
        CREATE TABLE public.questions (
          id BIGSERIAL PRIMARY KEY,
          category_id BIGINT REFERENCES public.test_categories(id) ON DELETE SET NULL,
          test_id BIGINT,
          difficulty TEXT,
          question_text TEXT NOT NULL,
          question_type TEXT,
          type TEXT DEFAULT 'MCQ',
          option_a TEXT,
          option_b TEXT,
          option_c TEXT,
          option_d TEXT,
          options JSONB,
          correct_answer TEXT NOT NULL,
          explanation TEXT,
          tags JSONB,
          marks INT DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      $q$;
    END IF;
  ELSE
    -- Existing questions table: add missing columns only
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'category_id'
    ) THEN
      IF cat_type = 'uuid' THEN
        ALTER TABLE public.questions
          ADD COLUMN category_id UUID REFERENCES public.test_categories(id) ON DELETE SET NULL;
      ELSE
        ALTER TABLE public.questions
          ADD COLUMN category_id BIGINT REFERENCES public.test_categories(id) ON DELETE SET NULL;
      END IF;
    END IF;

    ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS difficulty TEXT;
    ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'MCQ';
    ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS options JSONB;
    ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS tags JSONB;
    ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation TEXT;
    ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS question_type TEXT;
    ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS option_a TEXT;
    ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS option_b TEXT;
    ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS option_c TEXT;
    ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS option_d TEXT;
    ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS marks INT DEFAULT 1;
  END IF;

  -- Index only when column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'category_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_questions_category_id ON public.questions(category_id)';
  END IF;

  -- ========== tests: create or patch ==========
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tests'
  ) THEN
    IF cat_type = 'uuid' THEN
      EXECUTE $q$
        CREATE TABLE public.tests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT,
          title TEXT,
          category_id UUID NOT NULL REFERENCES public.test_categories(id) ON DELETE CASCADE,
          duration INTEGER DEFAULT 60,
          duration_minutes INTEGER,
          total_questions INTEGER NOT NULL DEFAULT 0,
          passing_score INTEGER,
          description TEXT,
          difficulty_level TEXT,
          difficulty TEXT,
          is_paid BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      $q$;
    ELSE
      EXECUTE $q$
        CREATE TABLE public.tests (
          id BIGSERIAL PRIMARY KEY,
          category_id BIGINT NOT NULL REFERENCES public.test_categories(id),
          title TEXT NOT NULL,
          name TEXT,
          description TEXT,
          duration_minutes INT NOT NULL DEFAULT 60,
          duration INTEGER,
          total_questions INT NOT NULL DEFAULT 0,
          difficulty TEXT,
          difficulty_level TEXT,
          passing_score INTEGER,
          is_paid BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      $q$;
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'tests' AND column_name = 'category_id'
    ) THEN
      IF cat_type = 'uuid' THEN
        ALTER TABLE public.tests
          ADD COLUMN category_id UUID REFERENCES public.test_categories(id) ON DELETE CASCADE;
      ELSE
        ALTER TABLE public.tests
          ADD COLUMN category_id BIGINT REFERENCES public.test_categories(id) ON DELETE CASCADE;
      END IF;
    END IF;

    ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS title TEXT;
    ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60;
    ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
    ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS difficulty TEXT;
    ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS difficulty_level TEXT;
    ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
    ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tests' AND column_name = 'category_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tests_category_id ON public.tests(category_id)';
  END IF;
END $$;

-- ========== test_questions (optional; skip if incompatible legacy types) ==========
DO $$
DECLARE
  q_id_type TEXT;
  t_id_type TEXT;
BEGIN
  SELECT c.data_type INTO q_id_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'questions' AND c.column_name = 'id';

  SELECT c.data_type INTO t_id_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'tests' AND c.column_name = 'id';

  IF q_id_type IS NULL OR t_id_type IS NULL OR q_id_type <> t_id_type THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'test_questions'
  ) THEN
    IF q_id_type = 'uuid' THEN
      EXECUTE $q$
        CREATE TABLE public.test_questions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
          question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
          "order" INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE (test_id, question_id)
        )
      $q$;
    ELSE
      EXECUTE $q$
        CREATE TABLE public.test_questions (
          id BIGSERIAL PRIMARY KEY,
          test_id BIGINT NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
          question_id BIGINT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
          "order" INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE (test_id, question_id)
        )
      $q$;
    END IF;
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON public.test_questions(test_id)';
  END IF;
END $$;

-- ========== RLS ==========
ALTER TABLE public.test_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_questions') THEN
    ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS prep_categories_public_read ON public.test_categories;
CREATE POLICY prep_categories_public_read ON public.test_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS prep_questions_public_read ON public.questions;
CREATE POLICY prep_questions_public_read ON public.questions FOR SELECT USING (true);

DROP POLICY IF EXISTS prep_questions_admin_write ON public.questions;
CREATE POLICY prep_questions_admin_write ON public.questions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );

DROP POLICY IF EXISTS prep_tests_public_read ON public.tests;
CREATE POLICY prep_tests_public_read ON public.tests FOR SELECT USING (true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_questions') THEN
    DROP POLICY IF EXISTS prep_test_questions_public_read ON public.test_questions;
    EXECUTE 'CREATE POLICY prep_test_questions_public_read ON public.test_questions FOR SELECT USING (true)';
  END IF;
END $$;

-- ========== Grants ==========
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.test_categories TO anon, authenticated;
GRANT SELECT ON public.questions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT SELECT ON public.tests TO anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_questions') THEN
    GRANT SELECT ON public.test_questions TO anon, authenticated;
  END IF;
END $$;

-- ========== Seed categories (columns ensured above) ==========
INSERT INTO public.test_categories (name, slug, description, icon, "order")
SELECT v.name, v.slug, v.description, v.icon, v.ord
FROM (VALUES
  ('Quantitative Ability', 'quantitative', 'Mathematics, numerical ability, and problem-solving', '📊', 1),
  ('Verbal Ability', 'verbal', 'English language, comprehension, and grammar', '📖', 2),
  ('Logical Reasoning', 'logical', 'Logic puzzles, pattern recognition, and analytical thinking', '🧠', 3),
  ('Coding / Programming', 'coding', 'Programming, data structures, and algorithms', '💻', 4),
  ('Current Affairs', 'current-affairs', 'Current events and general knowledge', '📰', 5),
  ('Company Specific', 'company-specific', 'Company-specific placement preparation', '🏢', 6),
  ('Psychometric Prep', 'psychometric', 'Personality and behavioral style questions', '🎭', 7),
  ('Mock Interview Prep', 'mock-interviews', 'Communication and structured interview drills', '🎤', 8),
  ('Department Exams', 'department-exams', 'Faculty-submitted exams approved by the examination cell', '🏫', 9)
) AS v(name, slug, description, icon, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_categories t WHERE t.slug = v.slug
);

UPDATE public.test_categories AS c
SET
  name = v.name,
  description = v.description,
  icon = v.icon,
  "order" = v.ord
FROM (VALUES
  ('Quantitative Ability', 'quantitative', 'Mathematics, numerical ability, and problem-solving', '📊', 1),
  ('Verbal Ability', 'verbal', 'English language, comprehension, and grammar', '📖', 2),
  ('Logical Reasoning', 'logical', 'Logic puzzles, pattern recognition, and analytical thinking', '🧠', 3),
  ('Coding / Programming', 'coding', 'Programming, data structures, and algorithms', '💻', 4),
  ('Current Affairs', 'current-affairs', 'Current events and general knowledge', '📰', 5),
  ('Company Specific', 'company-specific', 'Company-specific placement preparation', '🏢', 6),
  ('Psychometric Prep', 'psychometric', 'Personality and behavioral style questions', '🎭', 7),
  ('Mock Interview Prep', 'mock-interviews', 'Communication and structured interview drills', '🎤', 8),
  ('Department Exams', 'department-exams', 'Faculty-submitted exams approved by the examination cell', '🏫', 9)
) AS v(name, slug, description, icon, ord)
WHERE c.slug = v.slug;

NOTIFY pgrst, 'reload schema';
