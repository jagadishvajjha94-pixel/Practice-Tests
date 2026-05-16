-- Run in Supabase Dashboard → SQL Editor if public.users is missing (PGRST205).

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  college TEXT,
  branch TEXT,
  cgpa DECIMAL(3,2),
  phone TEXT,
  subscription_status TEXT DEFAULT 'free',
  subscription_end_date TIMESTAMPTZ,
  resume_text TEXT,
  resume_file_name TEXT,
  resume_storage_path TEXT,
  resume_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS resume_text TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS resume_file_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS resume_storage_path TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS resume_updated_at TIMESTAMPTZ;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prep_users_select_own ON public.users;
CREATE POLICY prep_users_select_own ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS prep_users_insert_own ON public.users;
CREATE POLICY prep_users_insert_own ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS prep_users_update_own ON public.users;
CREATE POLICY prep_users_update_own ON public.users
  FOR UPDATE USING (auth.uid() = id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('student-resumes', 'student-resumes', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS prep_resume_upload_own ON storage.objects;
CREATE POLICY prep_resume_upload_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'student-resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS prep_resume_read_own ON storage.objects;
CREATE POLICY prep_resume_read_own ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'student-resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS prep_resume_update_own ON storage.objects;
CREATE POLICY prep_resume_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'student-resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
