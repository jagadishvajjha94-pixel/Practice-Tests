-- Ensure student profile columns exist for targeting live exams + admin/faculty lists.
-- Safe to re-run.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'student';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS college TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';

NOTIFY pgrst, 'reload schema';
