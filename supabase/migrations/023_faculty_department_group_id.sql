-- Department groups + faculty_exam_requests.department_group_id (required for exam submit).
-- Safe to re-run. Run after 016/020 if faculty submit fails on department_group_id.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.department_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.department_group_members (
  group_id UUID NOT NULL REFERENCES public.department_groups(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  PRIMARY KEY (group_id, department)
);

CREATE INDEX IF NOT EXISTS idx_department_group_members_dept
  ON public.department_group_members(department);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'faculty_exam_requests'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'faculty_exam_requests'
      AND column_name = 'department_group_id'
  ) THEN
    ALTER TABLE public.faculty_exam_requests
      ADD COLUMN department_group_id UUID
        REFERENCES public.department_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_faculty_exam_requests_group
  ON public.faculty_exam_requests(department_group_id);

ALTER TABLE public.department_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS department_groups_read ON public.department_groups;
CREATE POLICY department_groups_read ON public.department_groups
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS department_group_members_read ON public.department_group_members;
CREATE POLICY department_group_members_read ON public.department_group_members
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.department_groups TO authenticated;
GRANT SELECT ON public.department_group_members TO authenticated;
GRANT ALL ON public.department_groups TO service_role;
GRANT ALL ON public.department_group_members TO service_role;

NOTIFY pgrst, 'reload schema';
