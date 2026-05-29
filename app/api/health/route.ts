import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isS3Configured } from '@/lib/aws/s3';
import { useAwsStack } from '@/lib/aws/stack';
import { autoEnsureRdsSchema, isAutoRdsSchemaEnabled } from '@/lib/db/auto-ensure-rds';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, string> = {
    app: 'ok',
    auth_mode: useAwsStack() ? 'prisma_jwt' : 'supabase_legacy',
  };

  if (isAutoRdsSchemaEnabled()) {
    const sync = await autoEnsureRdsSchema();
    checks.schema_auto_sync = sync.ok ? 'ok' : 'failed';
    if (!sync.ok && !sync.skipped) {
      checks.schema_auto_sync_detail = sync.message;
    }
  }

  try {
    await prisma.$queryRaw`SELECT 1 FROM users LIMIT 1`;
    checks.database = 'ok';
  } catch (err) {
    checks.database = err instanceof Error ? err.message : 'error';
    return NextResponse.json(
      { status: 'unhealthy', checks, timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }

  checks.s3 = isS3Configured() ? 'ok' : 'not_configured';

  const healthy = checks.database === 'ok';

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
