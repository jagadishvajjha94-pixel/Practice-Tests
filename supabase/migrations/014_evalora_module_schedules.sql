-- Admin-triggered Evalora sub-modules (psychometric, programming, etc. inside Evalora hub).
-- Safe to re-run.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.evalora_module_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL,
  title TEXT,
  notice TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'live', 'ended')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  target_departments TEXT[] NOT NULL DEFAULT '{}',
  target_years TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evalora_mod_status_starts
  ON public.evalora_module_schedules(status, starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_evalora_mod_key
  ON public.evalora_module_schedules(module_key);

ALTER TABLE public.evalora_module_schedules ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
