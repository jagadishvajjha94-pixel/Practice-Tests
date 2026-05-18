-- Faculty exam workflow: upload → admin approval → students (by dept + year)

CREATE TABLE IF NOT EXISTS public.faculty_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT,
  department TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faculty_profiles_department ON public.faculty_profiles(department);

CREATE TABLE IF NOT EXISTS public.faculty_exam_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_years TEXT[] NOT NULL DEFAULT '{}',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  questions_json JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  published_test_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faculty_exam_requests_status ON public.faculty_exam_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faculty_exam_requests_faculty ON public.faculty_exam_requests(faculty_user_id);
CREATE INDEX IF NOT EXISTS idx_faculty_exam_requests_department ON public.faculty_exam_requests(department);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'student';

ALTER TABLE public.faculty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_exam_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS faculty_profiles_own ON public.faculty_profiles;
CREATE POLICY faculty_profiles_own ON public.faculty_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS faculty_exam_requests_faculty_select ON public.faculty_exam_requests;
CREATE POLICY faculty_exam_requests_faculty_select ON public.faculty_exam_requests
  FOR SELECT USING (auth.uid() = faculty_user_id);

DROP POLICY IF EXISTS faculty_exam_requests_faculty_insert ON public.faculty_exam_requests;
CREATE POLICY faculty_exam_requests_faculty_insert ON public.faculty_exam_requests
  FOR INSERT WITH CHECK (auth.uid() = faculty_user_id AND status = 'pending');

GRANT SELECT, INSERT, UPDATE ON public.faculty_profiles TO authenticated;
GRANT SELECT, INSERT ON public.faculty_exam_requests TO authenticated;

NOTIFY pgrst, 'reload schema';
