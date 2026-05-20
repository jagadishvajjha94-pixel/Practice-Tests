-- Legacy DBs: test_categories exists without "order" (init-db / early schema).
-- Safe to re-run.

ALTER TABLE public.test_categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.test_categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.test_categories ADD COLUMN IF NOT EXISTS "order" INTEGER;
ALTER TABLE public.test_categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

NOTIFY pgrst, 'reload schema';
