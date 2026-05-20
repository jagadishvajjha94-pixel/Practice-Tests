/** Resolve Postgres connection string from env (POSTGRES_URL or SUPABASE_DB_PASSWORD + project URL). */
export function resolvePostgresUrl(): string | null {
  const direct = process.env.POSTGRES_URL?.trim();
  if (direct && !direct.includes('YOUR_')) return direct;

  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!password || !supabaseUrl || supabaseUrl.includes('YOUR_')) return null;

  const ref = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/i)?.[1];
  if (!ref) return null;

  const host = process.env.SUPABASE_DB_HOST?.trim() || `db.${ref}.supabase.co`;
  const port = process.env.SUPABASE_DB_PORT?.trim() || '5432';
  const user = process.env.SUPABASE_DB_USER?.trim() || 'postgres';
  const database = process.env.SUPABASE_DB_NAME?.trim() || 'postgres';

  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export function postgresUrlSetupHint(): string {
  return (
    'Set POSTGRES_URL in .env.local (Supabase → Project Settings → Database → Connection string URI), ' +
    'or set SUPABASE_DB_PASSWORD to your database password (same settings page).'
  );
}

/** Supabase dashboard → SQL editor for this project. */
export function supabaseSqlEditorUrl(): string | null {
  const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/i)?.[1];
  return ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : null;
}
