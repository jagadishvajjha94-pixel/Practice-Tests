-- Legacy DBs: tests.id is BIGINT but faculty_exam_requests.published_test_id was added as UUID.
-- Storing numeric test ids (e.g. 15) then fails with: invalid input syntax for type uuid: "15"
-- Safe to re-run.

DO $$
DECLARE
  tests_id_type TEXT;
  pub_type TEXT;
  sched_test_type TEXT;
BEGIN
  SELECT c.data_type INTO tests_id_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'tests' AND c.column_name = 'id';

  SELECT c.data_type INTO pub_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'faculty_exam_requests'
    AND c.column_name = 'published_test_id';

  IF tests_id_type IN ('bigint', 'integer', 'smallint')
     AND pub_type = 'uuid'
  THEN
    ALTER TABLE public.faculty_exam_requests
      ALTER COLUMN published_test_id TYPE TEXT USING published_test_id::text;
  END IF;

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

NOTIFY pgrst, 'reload schema';
