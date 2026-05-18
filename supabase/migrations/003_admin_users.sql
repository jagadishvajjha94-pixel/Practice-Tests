-- Admin whitelist for /admin panel (run in Supabase SQL Editor)
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
