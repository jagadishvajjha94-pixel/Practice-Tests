-- RMSET: admin-selected topic papers from the question bank.
-- Safe to re-run.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.rmset_papers (
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
);

CREATE INDEX IF NOT EXISTS idx_rmset_papers_status ON public.rmset_papers(status, updated_at DESC);

-- Default RMSET topic tags (link questions via question_tag_links or questions.tags JSONB)
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

NOTIFY pgrst, 'reload schema';
