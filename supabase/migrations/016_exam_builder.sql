-- Exam builder: syllabus-based papers with slot tracking to avoid repeated questions.
-- Safe to re-run. Creates prerequisite tables if earlier migrations were not applied.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Required for syllabus topic inserts (normally from 002_v2_platform_addons.sql)
CREATE TABLE IF NOT EXISTS public.question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Required for faculty exam workflow (normally from 005 + 011)
CREATE TABLE IF NOT EXISTS public.faculty_exam_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT,
  target_years TEXT[] NOT NULL DEFAULT '{}',
  target_branches TEXT[] NOT NULL DEFAULT '{}',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  questions_json JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  published_test_id UUID,
  test_type TEXT,
  slot_key TEXT,
  syllabus_topic_ids UUID[] NOT NULL DEFAULT '{}',
  questions_per_topic INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faculty_exam_requests_status
  ON public.faculty_exam_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faculty_exam_requests_faculty
  ON public.faculty_exam_requests(faculty_user_id);
CREATE INDEX IF NOT EXISTS idx_faculty_exam_requests_department
  ON public.faculty_exam_requests(department);
CREATE INDEX IF NOT EXISTS idx_faculty_exam_requests_topic
  ON public.faculty_exam_requests(topic);
CREATE INDEX IF NOT EXISTS idx_faculty_exam_requests_target_branches
  ON public.faculty_exam_requests USING GIN (target_branches);

-- Add exam-builder columns when table already existed from an older migration
ALTER TABLE public.faculty_exam_requests
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS target_branches TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS test_type TEXT,
  ADD COLUMN IF NOT EXISTS slot_key TEXT,
  ADD COLUMN IF NOT EXISTS syllabus_topic_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS questions_per_topic INTEGER;

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

-- Aptitude syllabus tags (link questions via question_tag_links or questions.tags JSONB)
INSERT INTO public.question_tags (name, slug)
VALUES
  ('Percentages', 'aptitude-percentages'),
  ('Profit & Loss', 'aptitude-profit-loss'),
  ('Time & Work', 'aptitude-time-work'),
  ('Time, Speed & Distance', 'aptitude-speed-distance'),
  ('Ratio & Proportion', 'aptitude-ratio-proportion'),
  ('Number Systems', 'aptitude-number-systems'),
  ('Simple & Compound Interest', 'aptitude-interest'),
  ('Averages', 'aptitude-averages'),
  ('Permutations & Combinations', 'aptitude-pnc'),
  ('Probability', 'aptitude-probability'),
  ('Mixtures & Allegations', 'aptitude-mixtures'),
  ('Partnership', 'aptitude-partnership'),
  ('Logical Deduction', 'logical-deduction'),
  ('Seating Arrangement', 'logical-seating'),
  ('Blood Relations', 'logical-blood-relations'),
  ('Syllogisms', 'logical-syllogisms'),
  ('Data Interpretation', 'logical-data-interpretation'),
  ('Technical — Programming', 'technical-programming'),
  ('Technical — DBMS', 'technical-dbms'),
  ('Technical — OS', 'technical-os'),
  ('Technical — Networks', 'technical-networks'),
  ('Verbal — Reading Comprehension', 'verbal-rc'),
  ('Verbal — Synonyms & Antonyms', 'verbal-vocabulary'),
  ('Verbal — Sentence Correction', 'verbal-grammar')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.faculty_exam_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_builder_draws ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS faculty_exam_requests_faculty_select ON public.faculty_exam_requests;
CREATE POLICY faculty_exam_requests_faculty_select ON public.faculty_exam_requests
  FOR SELECT USING (auth.uid() = faculty_user_id);

DROP POLICY IF EXISTS faculty_exam_requests_faculty_insert ON public.faculty_exam_requests;
CREATE POLICY faculty_exam_requests_faculty_insert ON public.faculty_exam_requests
  FOR INSERT WITH CHECK (auth.uid() = faculty_user_id AND status = 'pending');

GRANT SELECT, INSERT ON public.faculty_exam_requests TO authenticated;

NOTIFY pgrst, 'reload schema';
