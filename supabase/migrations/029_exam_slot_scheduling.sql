-- Date/slot scheduling: up to 8 slots per faculty exam, 130 students per slot roster.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE public.faculty_exam_requests
  ADD COLUMN IF NOT EXISTS uses_slot_scheduling BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS schedule_slots_json JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.exam_schedules
  ADD COLUMN IF NOT EXISTS slot_number INTEGER,
  ADD COLUMN IF NOT EXISTS slot_capacity INTEGER DEFAULT 130;

CREATE TABLE IF NOT EXISTS public.exam_slot_roster_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_exam_request_id UUID NOT NULL,
  slot_number INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 8),
  roll_number TEXT NOT NULL,
  student_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (faculty_exam_request_id, slot_number, roll_number)
);

CREATE INDEX IF NOT EXISTS idx_exam_slot_roster_request_slot
  ON public.exam_slot_roster_entries(faculty_exam_request_id, slot_number);

CREATE INDEX IF NOT EXISTS idx_exam_schedules_slot
  ON public.exam_schedules(faculty_exam_request_id, slot_number);

ALTER TABLE public.exam_slot_roster_entries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.exam_slot_roster_entries TO service_role;

NOTIFY pgrst, 'reload schema';
