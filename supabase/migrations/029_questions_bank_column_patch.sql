-- Patch legacy public.questions for exam-builder / question bank seeding.
-- Safe to re-run in Supabase SQL editor.

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'MCQ';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'MCQ';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS option_a TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS option_b TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS option_c TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS option_d TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS options JSONB;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS marks INT DEFAULT 1;

NOTIFY pgrst, 'reload schema';
