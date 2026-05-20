-- Legacy DBs: questions.id is BIGINT but exam_builder_draws from 016 used question_ids UUID[].
-- Safe to re-run.

DO $$
DECLARE
  qid_type text;
  draws_q_type text;
BEGIN
  SELECT c.data_type INTO qid_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'questions' AND c.column_name = 'id';

  IF qid_type IS DISTINCT FROM 'bigint' THEN
    RETURN;
  END IF;

  SELECT c.udt_name INTO draws_q_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'exam_builder_draws'
    AND c.column_name = 'question_ids';

  IF draws_q_type = '_uuid' THEN
    ALTER TABLE public.exam_builder_draws DROP COLUMN question_ids;
    ALTER TABLE public.exam_builder_draws
      ADD COLUMN question_ids BIGINT[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
