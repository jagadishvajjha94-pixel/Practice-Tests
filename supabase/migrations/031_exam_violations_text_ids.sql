-- Proctoring: ensure exam_violations exists and accepts text test/attempt ids (ElevateX uses placement_full).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.exam_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  attempt_id TEXT,
  test_id TEXT,
  violation_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'exam_violations'
      AND column_name = 'test_id'
      AND udt_name = 'uuid'
  ) THEN
    ALTER TABLE public.exam_violations
      ALTER COLUMN test_id TYPE TEXT USING test_id::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'exam_violations'
      AND column_name = 'attempt_id'
      AND udt_name = 'uuid'
  ) THEN
    ALTER TABLE public.exam_violations
      ALTER COLUMN attempt_id TYPE TEXT USING attempt_id::text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exam_violations_user_created
  ON public.exam_violations (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exam_violations_test_created
  ON public.exam_violations (test_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exam_violations_type_created
  ON public.exam_violations (violation_type, created_at DESC);

ALTER TABLE public.exam_violations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v2_violations_own ON public.exam_violations;
CREATE POLICY v2_violations_own ON public.exam_violations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.exam_violations TO authenticated;

NOTIFY pgrst, 'reload schema';
