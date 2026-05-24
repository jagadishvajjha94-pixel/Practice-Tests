-- Store department and academic year on per-slot roster rows (from + provisioning).

ALTER TABLE public.exam_slot_roster_entries
  ADD COLUMN IF NOT EXISTS branch TEXT,
  ADD COLUMN IF NOT EXISTS academic_year TEXT;

NOTIFY pgrst, 'reload schema';
