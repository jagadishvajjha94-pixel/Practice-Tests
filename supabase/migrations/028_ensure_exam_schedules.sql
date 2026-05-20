-- Faculty exam go-live schedules. Safe to re-run.
-- Fixes: Could not find table 'exam_schedules', or invalid UUID test_id "15"

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  tests_id_type TEXT;
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'exam_schedules'
  ) INTO table_exists;

  SELECT c.data_type INTO tests_id_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'tests' AND c.column_name = 'id';

  IF NOT table_exists THEN
    IF tests_id_type IN ('bigint', 'integer', 'smallint') THEN
      EXECUTE $q$
        CREATE TABLE public.exam_schedules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          description TEXT,
          notice TEXT,
          faculty_exam_request_id UUID,
          test_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'scheduled'
            CHECK (status IN ('scheduled', 'live', 'ended')),
          starts_at TIMESTAMPTZ NOT NULL,
          ends_at TIMESTAMPTZ,
          target_departments TEXT[] NOT NULL DEFAULT '{}',
          target_years TEXT[] NOT NULL DEFAULT '{}',
          created_by UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      $q$;
    ELSE
      EXECUTE $q$
        CREATE TABLE public.exam_schedules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          description TEXT,
          notice TEXT,
          faculty_exam_request_id UUID,
          test_id UUID NOT NULL,
          status TEXT NOT NULL DEFAULT 'scheduled'
            CHECK (status IN ('scheduled', 'live', 'ended')),
          starts_at TIMESTAMPTZ NOT NULL,
          ends_at TIMESTAMPTZ,
          target_departments TEXT[] NOT NULL DEFAULT '{}',
          target_years TEXT[] NOT NULL DEFAULT '{}',
          created_by UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      $q$;
    END IF;
  END IF;
END $$;

-- Legacy: numeric tests.id stored in UUID test_id column
DO $$
DECLARE
  tests_id_type TEXT;
  sched_test_type TEXT;
BEGIN
  SELECT c.data_type INTO tests_id_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'tests' AND c.column_name = 'id';

  SELECT c.data_type INTO sched_test_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'exam_schedules'
    AND c.column_name = 'test_id';

  IF tests_id_type IN ('bigint', 'integer', 'smallint')
     AND sched_test_type = 'uuid'
     AND EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'exam_schedules'
     )
  THEN
    ALTER TABLE public.exam_schedules
      ALTER COLUMN test_id TYPE TEXT USING test_id::text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exam_schedules_status_starts
  ON public.exam_schedules(status, starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_exam_schedules_faculty_request
  ON public.exam_schedules(faculty_exam_request_id);

CREATE INDEX IF NOT EXISTS idx_exam_schedules_test
  ON public.exam_schedules(test_id);

ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.exam_schedules TO authenticated;
GRANT ALL ON public.exam_schedules TO service_role;

NOTIFY pgrst, 'reload schema';
