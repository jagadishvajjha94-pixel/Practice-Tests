-- Reliable dashboard source (service role upsert on submit). Safe to re-run.

CREATE TABLE IF NOT EXISTS public.student_dashboard_stats (
  user_id UUID PRIMARY KEY,
  attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.student_dashboard_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prep_stats_select_own ON public.student_dashboard_stats;
CREATE POLICY prep_stats_select_own ON public.student_dashboard_stats
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

GRANT SELECT ON public.student_dashboard_stats TO authenticated;

NOTIFY pgrst, 'reload schema';
