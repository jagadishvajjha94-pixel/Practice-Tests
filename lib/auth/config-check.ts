/** Surface missing env before auth/DB calls return generic "invalid credentials". */
export function getAuthSetupErrors(): string[] {
  const errors: string[] = [];

  if (!process.env.AUTH_SECRET?.trim()) {
    errors.push('AUTH_SECRET is not set. Generate one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
  }

  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    errors.push('DATABASE_URL is not set. Copy .env.local.example to .env.local and add your RDS connection string.');
  } else if (dbUrl.includes('REPLACE_WITH') || dbUrl.includes('your-db.') || dbUrl.includes('PASSWORD@')) {
    errors.push('DATABASE_URL is still a placeholder. Replace it with your real AWS RDS PostgreSQL URL.');
  }

  return errors;
}
