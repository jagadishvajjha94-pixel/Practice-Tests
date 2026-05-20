-- Per-exam allowlist: only rostered students may take a scheduled live test.
-- Safe to re-run in Supabase SQL editor.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.exam_student_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_schedule_id UUID NOT NULL,
  roll_number TEXT NOT NULL,
  email TEXT,
  full_name TEXT,
  branch TEXT,
  academic_year TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (exam_schedule_id, roll_number)
);

CREATE INDEX IF NOT EXISTS idx_exam_roster_schedule
  ON public.exam_student_roster(exam_schedule_id);

CREATE INDEX IF NOT EXISTS idx_exam_roster_roll
  ON public.exam_student_roster(roll_number);

ALTER TABLE public.exam_student_roster ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exam_roster_admin_all ON public.exam_student_roster;
CREATE POLICY exam_roster_admin_all ON public.exam_student_roster
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

NOTIFY pgrst, 'reload schema';
