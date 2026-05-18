-- One-shot setup: public.users + public.admin_users (Supabase SQL Editor)
-- Project: https://supabase.com/dashboard/project/lwkmfpcewpisezmcsext/sql/new

-- === users profile (001) ===
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

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prep_users_select_own ON public.users;
CREATE POLICY prep_users_select_own ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS prep_users_insert_own ON public.users;
CREATE POLICY prep_users_insert_own ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS prep_users_update_own ON public.users;
CREATE POLICY prep_users_update_own ON public.users FOR UPDATE USING (auth.uid() = id);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- === admin whitelist (003) ===
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin',
  permissions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prep_admin_users_select_own ON public.admin_users;
CREATE POLICY prep_admin_users_select_own ON public.admin_users
  FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT ON public.admin_users TO authenticated;

NOTIFY pgrst, 'reload schema';
