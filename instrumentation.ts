/**
 * Runs once when a Node.js server instance starts (Vercel / self-hosted).
 * Creates RDS tables/columns automatically when USE_AWS_STACK=true.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { autoEnsureRdsSchema, isAutoRdsSchemaEnabled } = await import('@/lib/db/auto-ensure-rds');
  if (!isAutoRdsSchemaEnabled()) return;

  try {
    const result = await autoEnsureRdsSchema();
    if (!result.ok && !result.skipped) {
      console.error('[rds] Auto schema sync failed:', result.message);
    }
  } catch (err) {
    console.error('[rds] Auto schema sync error:', err);
  }
}
