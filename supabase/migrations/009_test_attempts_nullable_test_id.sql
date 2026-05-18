-- Allow attempts without a published test row (competitive / fallback exams).
ALTER TABLE public.test_attempts ALTER COLUMN test_id DROP NOT NULL;

NOTIFY pgrst, 'reload schema';
