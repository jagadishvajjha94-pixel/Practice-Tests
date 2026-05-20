-- RCEE department groups (https://www.rcee.ac.in/)
-- Self-contained: creates tables if 017 was not applied. Safe to re-run.

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

-- Link to faculty exams when that table exists (from 005 / 016)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'faculty_exam_requests'
  ) THEN
    ALTER TABLE public.faculty_exam_requests
      ADD COLUMN IF NOT EXISTS department_group_id UUID
        REFERENCES public.department_groups(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_faculty_exam_requests_group
      ON public.faculty_exam_requests(department_group_id);
  END IF;
END $$;

INSERT INTO public.department_groups (name, description)
VALUES
  ('Civil Engineering', 'Civil Engineering students and faculty'),
  ('Mechanical Engineering', 'Mechanical Engineering students and faculty'),
  ('Electrical & Electronics Engineering', 'EEE students and faculty'),
  ('Electronics & Communication Engineering', 'ECE students and faculty'),
  ('Computer Science Engineering', 'CSE students and faculty'),
  ('Computer Science Engineering (Cyber Security)', 'CSE Cyber Security students and faculty'),
  ('Computer Science Engineering (Internet of Things)', 'CSE IoT students and faculty'),
  ('Artificial Intelligence and Data Science', 'AI & Data Science students and faculty'),
  ('Artificial Intelligence & Machine Learning', 'AI & ML students and faculty'),
  ('Business Administration', 'Business Administration / MBA students and faculty'),
  ('All CSE Branches', 'CSE, Cyber Security, IoT, AIDS, and AIML combined'),
  ('Core Branches (ECE + EEE)', 'Combined ECE and EEE cohort')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.department_group_members (group_id, department)
SELECT g.id, m.department
FROM public.department_groups g
JOIN (
  VALUES
    ('Civil Engineering', 'Civil Engineering'),
    ('Mechanical Engineering', 'Mechanical Engineering'),
    ('Electrical & Electronics Engineering', 'Electrical & Electronics Engineering'),
    ('Electronics & Communication Engineering', 'Electronics & Communication Engineering'),
    ('Computer Science Engineering', 'Computer Science Engineering'),
    ('Computer Science Engineering (Cyber Security)', 'Computer Science Engineering (Cyber Security)'),
    ('Computer Science Engineering (Internet of Things)', 'Computer Science Engineering (Internet of Things)'),
    ('Artificial Intelligence and Data Science', 'Artificial Intelligence and Data Science'),
    ('Artificial Intelligence & Machine Learning', 'Artificial Intelligence & Machine Learning'),
    ('Business Administration', 'Business Administration'),
    ('All CSE Branches', 'Computer Science Engineering'),
    ('All CSE Branches', 'Computer Science Engineering (Cyber Security)'),
    ('All CSE Branches', 'Computer Science Engineering (Internet of Things)'),
    ('All CSE Branches', 'Artificial Intelligence and Data Science'),
    ('All CSE Branches', 'Artificial Intelligence & Machine Learning'),
    ('Core Branches (ECE + EEE)', 'Electronics & Communication Engineering'),
    ('Core Branches (ECE + EEE)', 'Electrical & Electronics Engineering')
) AS m(group_name, department) ON g.name = m.group_name
ON CONFLICT DO NOTHING;

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

NOTIFY pgrst, 'reload schema';
