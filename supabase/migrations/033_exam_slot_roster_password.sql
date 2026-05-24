-- Optional login password on slot roster rows (for faculty credential export after approval).

ALTER TABLE public.exam_slot_roster_entries
  ADD COLUMN IF NOT EXISTS login_password TEXT;

NOTIFY pgrst, 'reload schema';
