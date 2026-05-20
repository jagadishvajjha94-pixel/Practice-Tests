-- Ensures question bank tables exist before seed (019) or draw-from-bank.
-- Run in Supabase SQL Editor if you see:
--   "Could not find the table 'public.questions' in the schema cache"
-- Safe to re-run.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Minimal categories (optional FK target for questions)
CREATE TABLE IF NOT EXISTS public.test_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  "order" INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'test_categories_slug_key' AND conrelid = 'public.test_categories'::regclass
  ) THEN
    ALTER TABLE public.test_categories ADD CONSTRAINT test_categories_slug_key UNIQUE (slug);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Core MCQ bank
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.test_categories(id) ON DELETE SET NULL,
  test_id UUID,
  difficulty TEXT DEFAULT 'medium',
  question_text TEXT NOT NULL,
  type TEXT DEFAULT 'MCQ',
  question_type TEXT DEFAULT 'MCQ',
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  options JSONB,
  correct_answer TEXT NOT NULL DEFAULT 'A',
  explanation TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  marks INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS test_id UUID;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'MCQ';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'MCQ';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS option_a TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS option_b TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS option_c TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS option_d TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS options JSONB;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS correct_answer TEXT DEFAULT 'A';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS marks INT DEFAULT 1;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_questions_tags_gin ON public.questions USING GIN (tags);

-- Syllabus tags (016 may have created these)
CREATE TABLE IF NOT EXISTS public.question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.question_tag_links (
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.question_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_question_tag_links_tag ON public.question_tag_links(tag_id);

CREATE TABLE IF NOT EXISTS public.exam_builder_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type TEXT NOT NULL,
  slot_key TEXT NOT NULL,
  topic_ids UUID[] NOT NULL DEFAULT '{}',
  question_ids UUID[] NOT NULL DEFAULT '{}',
  faculty_exam_request_id UUID,
  test_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_builder_draws_type_slot
  ON public.exam_builder_draws(test_type, slot_key, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS + grants (match 006)
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_tag_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_builder_draws ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS prep_question_tags_read ON public.question_tags;
CREATE POLICY prep_question_tags_read ON public.question_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS prep_question_tag_links_read ON public.question_tag_links;
CREATE POLICY prep_question_tag_links_read ON public.question_tag_links FOR SELECT USING (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.questions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT SELECT ON public.question_tags TO anon, authenticated;
GRANT SELECT ON public.question_tag_links TO anon, authenticated;

-- Refresh PostgREST / Supabase API schema cache
NOTIFY pgrst, 'reload schema';
