-- One active login per student roll number (concurrent session lock).

CREATE TABLE IF NOT EXISTS public.student_active_sessions (
  roll_number text PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_active_sessions_user_id
  ON public.student_active_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_student_active_sessions_last_seen
  ON public.student_active_sessions (last_seen_at DESC);

COMMENT ON TABLE public.student_active_sessions IS
  'Tracks the active Supabase session per student roll number to block concurrent logins.';
