-- Allow all editor languages in coding_submissions (run in SQL Editor if logging fails)
ALTER TABLE public.coding_submissions DROP CONSTRAINT IF EXISTS coding_submissions_language_check;

ALTER TABLE public.coding_submissions
  ADD CONSTRAINT coding_submissions_language_check
  CHECK (language IN ('python', 'java', 'c', 'cpp', 'javascript', 'go', 'csharp'));

NOTIFY pgrst, 'reload schema';
