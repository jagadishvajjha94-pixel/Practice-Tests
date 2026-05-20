-- Proctoring: create exam_violations (if missing) + scale indexes + attempt metadata.
-- Safe to re-run in Supabase SQL Editor (does not require 002_v2_platform_addons.sql).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core violations log (standalone — no FK so it works even if public.users is missing)
CREATE TABLE IF NOT EXISTS public.exam_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  attempt_id UUID,
  test_id UUID,
  violation_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_violations_attempt
  ON public.exam_violations(attempt_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exam_violations_user_created
  ON public.exam_violations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exam_violations_test_created
  ON public.exam_violations(test_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exam_violations_type_created
  ON public.exam_violations(violation_type, created_at DESC);

ALTER TABLE public.exam_violations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v2_violations_own ON public.exam_violations;
CREATE POLICY v2_violations_own ON public.exam_violations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.exam_violations TO authenticated;

-- Proctor metadata on submitted attempts (skip gracefully if test_attempts not created yet)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'test_attempts'
  ) THEN
    ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS proctor_violations INTEGER DEFAULT 0;
    ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS proctor_auto_submit BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS proctor_session_id TEXT;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
