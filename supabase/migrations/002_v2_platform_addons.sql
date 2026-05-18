-- V2 addon tables (backward-compatible). Run in Supabase SQL Editor after 001_users_resume.sql.

-- Question tags (many-to-many ready)
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

-- Coding platform
CREATE TABLE IF NOT EXISTS public.coding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
  language TEXT NOT NULL CHECK (language IN ('python', 'c', 'java', 'javascript')),
  source_code TEXT NOT NULL,
  stdin TEXT,
  stdout TEXT,
  stderr TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'accepted', 'wrong_answer', 'tle', 'mle', 'error')),
  runtime_ms INTEGER,
  memory_kb INTEGER,
  passed_public INTEGER DEFAULT 0,
  passed_hidden INTEGER DEFAULT 0,
  plagiarism_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coding_submissions_user ON public.coding_submissions(user_id, created_at DESC);

-- AI reports (MCQ gen, hints, performance, resume, etc.)
CREATE TABLE IF NOT EXISTS public.ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  input_summary TEXT,
  output_json JSONB,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_reports_user_type ON public.ai_reports(user_id, report_type, created_at DESC);

-- Exam proctoring violations
CREATE TABLE IF NOT EXISTS public.exam_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  attempt_id UUID,
  test_id UUID REFERENCES public.tests(id) ON DELETE SET NULL,
  violation_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_violations_attempt ON public.exam_violations(attempt_id, created_at DESC);

-- Practice portal
CREATE TABLE IF NOT EXISTS public.practice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
  topic_slug TEXT,
  difficulty TEXT,
  is_correct BOOLEAN,
  time_spent_sec INTEGER,
  streak_day DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_history_user ON public.practice_history(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, question_id)
);

-- Leaderboards & contests
CREATE TABLE IF NOT EXISTS public.leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'coding',
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score NUMERIC(10, 2) NOT NULL DEFAULT 0,
  rank INTEGER,
  period TEXT NOT NULL DEFAULT 'weekly',
  metadata JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (scope, user_id, period)
);

CREATE TABLE IF NOT EXISTS public.contest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics snapshots
CREATE TABLE IF NOT EXISTS public.performance_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  test_id UUID REFERENCES public.tests(id) ON DELETE SET NULL,
  accuracy NUMERIC(5, 2),
  weak_topics JSONB,
  section_scores JSONB,
  ai_prediction JSONB,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_analytics_user ON public.performance_analytics(user_id, computed_at DESC);

-- Test sections (section-wise timers) — optional link on tests
CREATE TABLE IF NOT EXISTS public.test_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  cutoff_score INTEGER,
  negative_marking NUMERIC(4, 2) DEFAULT 0,
  shuffle_questions BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_sections_test ON public.test_sections(test_id, sort_order);

-- RLS (student owns own rows)
ALTER TABLE public.coding_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v2_coding_own ON public.coding_submissions;
CREATE POLICY v2_coding_own ON public.coding_submissions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS v2_ai_reports_own ON public.ai_reports;
CREATE POLICY v2_ai_reports_own ON public.ai_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY v2_ai_reports_insert ON public.ai_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS v2_violations_own ON public.exam_violations;
CREATE POLICY v2_violations_own ON public.exam_violations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS v2_practice_own ON public.practice_history;
CREATE POLICY v2_practice_own ON public.practice_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS v2_bookmarks_own ON public.bookmarks;
CREATE POLICY v2_bookmarks_own ON public.bookmarks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS v2_analytics_own ON public.performance_analytics;
CREATE POLICY v2_analytics_own ON public.performance_analytics FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS v2_leaderboards_read ON public.leaderboards;
CREATE POLICY v2_leaderboards_read ON public.leaderboards FOR SELECT TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
