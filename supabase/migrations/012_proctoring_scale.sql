-- Proctoring scale: indexes + attempt metadata. Safe to re-run.

CREATE INDEX IF NOT EXISTS idx_exam_violations_user_created
  ON public.exam_violations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exam_violations_test_created
  ON public.exam_violations(test_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exam_violations_type_created
  ON public.exam_violations(violation_type, created_at DESC);

ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS proctor_violations INTEGER DEFAULT 0;
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS proctor_auto_submit BOOLEAN DEFAULT FALSE;
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS proctor_session_id TEXT;

NOTIFY pgrst, 'reload schema';
