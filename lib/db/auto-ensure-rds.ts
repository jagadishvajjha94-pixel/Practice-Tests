import { useAwsStack } from '@/lib/aws/stack';
import { ensureRdsSchema, isRdsSchemaReady } from '@/lib/db/ensure-rds-schema';

type RdsEnsureGlobal = {
  rdsSchemaEnsured?: boolean;
  rdsSchemaInflight?: Promise<{ ok: boolean; message: string }>;
};

const g = globalThis as typeof globalThis & RdsEnsureGlobal;

/** Default on for AWS/RDS — set AUTO_RDS_SCHEMA=false to disable automatic db push. */
export function isAutoRdsSchemaEnabled(): boolean {
  if (!useAwsStack()) return false;
  return process.env.AUTO_RDS_SCHEMA !== 'false';
}

/**
 * Ensures RDS has all tables/columns from prisma/schema.prisma.
 * Runs at most once per server instance (safe for Vercel serverless cold starts).
 */
export async function autoEnsureRdsSchema(): Promise<{ ok: boolean; message: string; skipped?: boolean }> {
  if (!isAutoRdsSchemaEnabled()) {
    return { ok: true, message: 'Auto schema disabled', skipped: true };
  }

  if (g.rdsSchemaEnsured) {
    return { ok: true, message: 'Schema already ensured this instance' };
  }

  if (!g.rdsSchemaInflight) {
    g.rdsSchemaInflight = (async () => {
      const ready = await isRdsSchemaReady();
      if (ready) {
        return { ok: true, message: 'Schema already present' };
      }
      return await ensureRdsSchema();
    })().then((result) => {
      g.rdsSchemaEnsured = true;
      g.rdsSchemaInflight = undefined;
      return result;
    });
  }

  return g.rdsSchemaInflight;
}
