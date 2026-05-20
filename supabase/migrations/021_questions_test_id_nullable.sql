-- Bank MCQs are not tied to a single exam; allow NULL test_id on legacy questions table.
-- Safe to re-run.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'questions'
      AND column_name = 'test_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.questions ALTER COLUMN test_id DROP NOT NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
