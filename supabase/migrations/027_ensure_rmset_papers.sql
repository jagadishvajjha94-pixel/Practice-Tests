-- RMSET papers table (admin topic-selected papers). Safe to re-run.
-- Run if you see: Could not find the table 'public.rmset_papers' in the schema cache

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
DECLARE
  tests_id_type TEXT;
  papers_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'rmset_papers'
  ) INTO papers_exists;

  IF papers_exists THEN
    RETURN;
  END IF;

  SELECT c.data_type INTO tests_id_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'tests' AND c.column_name = 'id';

  IF tests_id_type IN ('bigint', 'integer', 'smallint') THEN
    EXECUTE $q$
      CREATE TABLE public.rmset_papers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        test_id TEXT,
        topic_ids UUID[] NOT NULL DEFAULT '{}',
        questions_per_topic INTEGER NOT NULL DEFAULT 10 CHECK (questions_per_topic > 0),
        duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
        status TEXT NOT NULL DEFAULT 'draft'
          CHECK (status IN ('draft', 'published', 'archived')),
        created_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    $q$;
  ELSE
    EXECUTE $q$
      CREATE TABLE public.rmset_papers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        test_id UUID REFERENCES public.tests(id) ON DELETE SET NULL,
        topic_ids UUID[] NOT NULL DEFAULT '{}',
        questions_per_topic INTEGER NOT NULL DEFAULT 10 CHECK (questions_per_topic > 0),
        duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
        status TEXT NOT NULL DEFAULT 'draft'
          CHECK (status IN ('draft', 'published', 'archived')),
        created_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    $q$;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rmset_papers_status
  ON public.rmset_papers(status, updated_at DESC);

INSERT INTO public.question_tags (name, slug)
VALUES
  ('Quantitative Aptitude', 'quantitative-aptitude'),
  ('Logical Reasoning', 'logical-reasoning'),
  ('Verbal Ability', 'verbal-ability'),
  ('English Grammar', 'english-grammar'),
  ('Computer Science', 'computer-science'),
  ('Data Structures & Algorithms', 'dsa'),
  ('Database Management', 'dbms'),
  ('Operating Systems', 'operating-systems'),
  ('Electronics', 'electronics'),
  ('Mechanical Engineering', 'mechanical')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.test_categories (name, slug, description, icon)
SELECT 'RMSET', 'rmset', 'Ramachandra Multi-Section Eligibility Test — topic-selected MCQ paper', '📋'
WHERE NOT EXISTS (SELECT 1 FROM public.test_categories WHERE slug = 'rmset');

ALTER TABLE public.rmset_papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rmset_papers_read ON public.rmset_papers;
CREATE POLICY rmset_papers_read ON public.rmset_papers
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.rmset_papers TO authenticated;
GRANT ALL ON public.rmset_papers TO service_role;

NOTIFY pgrst, 'reload schema';
