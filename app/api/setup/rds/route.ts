import { NextRequest, NextResponse } from 'next/server';
import { useAwsStack } from '@/lib/aws/stack';
import { autoEnsureRdsSchema } from '@/lib/db/auto-ensure-rds';
import { ensureRdsSchema, isRdsSchemaReady } from '@/lib/db/ensure-rds-schema';
import { bootstrapRdsAdmin, seedRdsBaseline } from '@/lib/db/seed-rds-baseline';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

async function isFirstRun(): Promise<boolean> {
  try {
    const count = await prisma.user.count();
    return count === 0;
  } catch {
    return true;
  }
}

/** GET — RDS setup status (for /setup page). */
export async function GET() {
  if (!useAwsStack()) {
    return NextResponse.json({
      mode: 'supabase',
      message: 'Set USE_AWS_STACK=true to use RDS auto-setup.',
    });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { mode: 'aws', schemaReady: false, error: 'DATABASE_URL is not set' },
      { status: 503 },
    );
  }

  const schemaReady = await isRdsSchemaReady();
  let categoryCount = 0;
  let userCount = 0;

  if (schemaReady) {
    try {
      [categoryCount, userCount] = await Promise.all([
        prisma.testCategory.count(),
        prisma.user.count(),
      ]);
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({
    mode: 'aws',
    schemaReady,
    categoryCount,
    userCount,
    needsSchema: !schemaReady,
    needsSeed: schemaReady && categoryCount === 0,
    needsAdmin: schemaReady && userCount === 0,
  });
}

/** POST — create/update schema, seed sample data, bootstrap admin. */
export async function POST(request: NextRequest) {
  if (!useAwsStack()) {
    return NextResponse.json(
      { error: 'RDS setup only runs when USE_AWS_STACK=true' },
      { status: 400 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL is not set' }, { status: 503 });
  }

  let body: { step?: 'schema' | 'seed' | 'admin' | 'all'; setupSecret?: string } = {
    step: 'all',
  };
  try {
    body = { step: 'all', ...((await request.json()) as typeof body) };
  } catch {
    /* empty body */
  }

  const secret = process.env.RDS_SETUP_SECRET?.trim();
  if (secret) {
    const provided = request.headers.get('x-rds-setup-secret') ?? body.setupSecret;
    if (provided !== secret) {
      return NextResponse.json({ error: 'Invalid RDS_SETUP_SECRET' }, { status: 403 });
    }
  } else {
    const first = await isFirstRun();
    if (!first) {
      return NextResponse.json(
        {
          error:
            'Database already has users. Set RDS_SETUP_SECRET in env to run setup again, or use admin tools.',
        },
        { status: 403 },
      );
    }
  }

  const step = body.step ?? 'all';
  const results: Record<string, unknown> = { step };

  if (step === 'schema' || step === 'all') {
    const schema = step === 'all' ? await autoEnsureRdsSchema() : await ensureRdsSchema();
    results.schema = schema;
    if (!schema.ok) {
      return NextResponse.json({ error: schema.message, detail: schema.detail, results }, { status: 500 });
    }
  }

  if (step === 'admin' || step === 'all') {
    results.admin = await bootstrapRdsAdmin();
  }

  if (step === 'seed' || step === 'all') {
    results.seed = await seedRdsBaseline();
  }

  const status = await GET();
  const statusJson = await status.json();

  return NextResponse.json({
    ok: true,
    message:
      step === 'schema'
        ? 'Schema synced to RDS.'
        : 'RDS ready: schema, admin, and sample categories/tests created.',
    results,
    status: statusJson,
  });
}
