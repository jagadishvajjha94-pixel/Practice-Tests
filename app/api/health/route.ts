import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isS3Configured } from '@/lib/aws/s3';
import { useAwsStack } from '@/lib/aws/stack';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, string> = {
    app: 'ok',
    auth_mode: useAwsStack() ? 'prisma_jwt' : 'supabase_legacy',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
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
