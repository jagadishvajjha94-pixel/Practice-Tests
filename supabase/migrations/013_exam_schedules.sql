-- Admin-controlled live & upcoming exam schedules for student dashboard.
-- Safe to re-run in Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.exam_schedules (
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
);

CREATE INDEX IF NOT EXISTS idx_exam_schedules_status_starts
  ON public.exam_schedules(status, starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_exam_schedules_faculty_request
  ON public.exam_schedules(faculty_exam_request_id);

CREATE INDEX IF NOT EXISTS idx_exam_schedules_test
  ON public.exam_schedules(test_id);

ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;

-- Students read via API (service role). No direct client policies required.
GRANT SELECT ON public.exam_schedules TO authenticated;

NOTIFY pgrst, 'reload schema';
