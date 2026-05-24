import { NextResponse } from 'next/server';
import { ensureLiveExamDb, probeLiveExamDb } from '@/lib/ensure-live-exam-db';
import { postgresUrlSetupHint, supabaseSqlEditorUrl } from '@/lib/postgres-url';

/** Bootstrap tables for live leaderboard, attempts, and proctoring. */
export async function POST() {
  const before = await probeLiveExamDb();
  const result = await ensureLiveExamDb();

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error ?? 'Bootstrap failed',
        missingBefore: before.missing,
        hint: postgresUrlSetupHint(),
        sqlEditorUrl: supabaseSqlEditorUrl(),
      },
      { status: result.error?.includes('not configured') ? 400 : 500 },
    );
  }

  const after = await probeLiveExamDb();
  return NextResponse.json({
    success: true,
    message: 'Live exam database is ready.',
    missingBefore: before.missing,
    missingAfter: after.missing,
  });
}

export async function GET() {
  const status = await probeLiveExamDb();
  return NextResponse.json(status);
}
