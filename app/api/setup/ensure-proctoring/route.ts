import { NextResponse } from 'next/server';
import { ensureExamViolationsTable } from '@/lib/ensure-exam-violations';
import { postgresUrlSetupHint, rdsSqlEditorUrl } from '@/lib/postgres-url';

/** Creates exam_violations table for live proctoring during exams. */
export async function POST() {
  const result = await ensureExamViolationsTable();

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error ?? 'Failed to ensure exam_violations',
        hint: postgresUrlSetupHint(),
        sqlFile: 'db/migrations/012_proctoring_scale.sql',
        sqlEditorUrl: rdsSqlEditorUrl(),
      },
      { status: result.error?.includes('not configured') ? 400 : 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: 'exam_violations table is ready for live proctoring.',
  });
}
