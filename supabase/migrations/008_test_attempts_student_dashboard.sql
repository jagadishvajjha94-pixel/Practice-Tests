-- Student test attempts (dashboard stats). Safe to re-run in Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- UUID schema (preferred)
CREATE TABLE IF NOT EXISTS public.test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id UUID,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score NUMERIC(5, 2),
  percentage_score NUMERIC(5, 2),
  total_score NUMERIC(10, 2),
  answers JSONB,
  time_taken INTEGER,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legacy/bigint installs: add columns used by the app
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS score NUMERIC(5, 2);
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS percentage_score NUMERIC(5, 2);
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS total_score NUMERIC(10, 2);
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS answers JSONB;
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS time_taken INTEGER;
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress';
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.test_attempts
SET score = percentage_score
WHERE score IS NULL AND percentage_score IS NOT NULL;

UPDATE public.test_attempts
SET status = 'completed'
WHERE status IS NULL AND completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_test_attempts_user_id ON public.test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_id ON public.test_attempts(test_id);

ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prep_attempts_select_own ON public.test_attempts;
CREATE POLICY prep_attempts_select_own ON public.test_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS prep_attempts_insert_own ON public.test_attempts;
CREATE POLICY prep_attempts_insert_own ON public.test_attempts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS prep_attempts_update_own ON public.test_attempts;
CREATE POLICY prep_attempts_update_own ON public.test_attempts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.test_attempts TO authenticated;

NOTIFY pgrst, 'reload schema';
