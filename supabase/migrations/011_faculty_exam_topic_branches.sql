-- 011_faculty_exam_topic_branches.sql
-- Extends faculty_exam_requests with topic and an optional list of additional
-- target branches so a faculty member can scope a test to one or more branches
-- (in addition to the primary `department` they belong to) and a topic / unit.

ALTER TABLE public.faculty_exam_requests
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS target_branches TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_faculty_exam_requests_topic
  ON public.faculty_exam_requests(topic);

CREATE INDEX IF NOT EXISTS idx_faculty_exam_requests_target_branches
  ON public.faculty_exam_requests USING GIN (target_branches);
