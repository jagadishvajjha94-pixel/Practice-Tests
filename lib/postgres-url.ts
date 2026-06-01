/** AWS RDS rejects non-SSL clients (pg_hba "no encryption"). */
export function withAwsRdsSsl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  const isRds =
    trimmed.includes('rds.amazonaws.com') ||
    trimmed.includes('.amazonaws.com') ||
    process.env.USE_AWS_STACK === 'true';
  if (!isRds) return trimmed;
  if (/[?&]sslmode=/i.test(trimmed)) return trimmed;
  const sep = trimmed.includes('?') ? '&' : '?';
  return `${trimmed}${sep}sslmode=require`;
}

/** Patch env before Prisma/postgres clients connect (safe to call repeatedly). */
export function normalizeDatabaseEnvUrls(): void {
  for (const key of ['DATABASE_URL', 'DIRECT_URL', 'POSTGRES_URL'] as const) {
    const raw = process.env[key]?.trim();
    if (!raw || raw.includes('YOUR_') || raw.includes('REPLACE_WITH')) continue;
    process.env[key] = withAwsRdsSsl(raw);
  }
}

/** Resolve Postgres connection string from env (DATABASE_URL or POSTGRES_URL). */
export function resolvePostgresUrl(): string | null {
  normalizeDatabaseEnvUrls();

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl && !databaseUrl.includes('YOUR_')) return databaseUrl;

  const direct = process.env.POSTGRES_URL?.trim();
  if (direct && !direct.includes('YOUR_')) return direct;

  const password = process.env.DATABASE_PASSWORD?.trim();
  const host = process.env.RDS_HOST?.trim();
  const port = process.env.RDS_PORT?.trim() || '5432';
  const user = process.env.RDS_USER?.trim() || 'postgres';
  const database = process.env.RDS_NAME?.trim() || 'prepindia';

  if (!password || !host || host.includes('YOUR_')) return null;

  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}?sslmode=require`;
}

export function postgresUrlSetupHint(): string {
  return (
    'Set DATABASE_URL in .env.local (AWS RDS PostgreSQL connection string), ' +
    'or set POSTGRES_URL / RDS_HOST + DATABASE_PASSWORD.'
  );
}

/** AWS RDS console SQL workspace (region-specific). */
export function rdsSqlEditorUrl(): string | null {
  const region = process.env.AWS_REGION?.trim() || 'ap-south-1';
  return `https://${region}.console.aws.amazon.com/rds/home?#databases:`;
}
