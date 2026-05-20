import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { loadAllAttemptsRollup } from '@/lib/admin/attempts-rollup';
import { resolveStoredPercent } from '@/lib/test-attempts';
import { answersMatchMcq } from '@/lib/practice-mappers';
import { adaptQuestionRow } from '@/lib/practice-mappers';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const { userId } = await params;
  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const { attempts: allAttempts } = await loadAllAttemptsRollup(admin);
  const userAttempts = allAttempts.filter((a) => a.user_id === userId);

  const detailed = await Promise.all(
    userAttempts.map(async (attempt) => {
      const { data: row } = await admin
        .from('test_attempts')
        .select('*, test:tests(*)')
        .eq('id', attempt.id)
        .maybeSingle();

      const answers =
        row && typeof row.answers === 'object'
          ? (row.answers as Record<string, { userAnswer?: unknown }>)
          : {};

      const testId = attempt.test_id ?? '';
      let questions: ReturnType<typeof adaptQuestionRow>[] = [];

      if (testId) {
        const { data: linked } = await admin
          .from('test_questions')
          .select('question:questions(*)')
          .eq('test_id', testId);

        questions = (linked ?? [])
          .map((l) => {
            const q = (l as { question?: Record<string, unknown> }).question;
            return q ? adaptQuestionRow(q) : null;
          })
          .filter((q): q is ReturnType<typeof adaptQuestionRow> => q != null);

        if (!questions.length) {
          const { data: direct } = await admin
            .from('questions')
            .select('*')
            .eq('test_id', testId);
          questions = (direct ?? []).map((q) =>
            adaptQuestionRow(q as Record<string, unknown>),
          );
        }
      }

      const questionRows = questions.map((q) => {
        const userAnswer = String(answers[q.id]?.userAnswer ?? '');
        return {
          questionText: q.question_text,
          userAnswer,
          correctAnswer: String(q.correct_answer ?? ''),
          isCorrect: answersMatchMcq(userAnswer, q.correct_answer),
        };
      });

      const score =
        row != null
          ? resolveStoredPercent(
              row.percentage_score != null ? Number(row.percentage_score) : null,
              row.score != null ? Number(row.score) : null,
              row.total_score != null ? Number(row.total_score) : null,
            )
          : attempt.score;

      const testRow = row?.test as { name?: string; title?: string } | null | undefined;

      return {
        id: attempt.id,
        testName:
          attempt.test_name ??
          testRow?.title ??
          testRow?.name ??
          `Test ${testId}`,
        score,
        status: attempt.status,
        date: attempt.created_at,
        timeTakenSec: attempt.time_taken ?? 0,
        answeredCount: questionRows.filter((q) => q.userAnswer.trim().length > 0).length,
        correctCount: questionRows.filter((q) => q.isCorrect).length,
        totalQuestions: questionRows.length,
        questions: questionRows,
      };
    }),
  );

  const scores = detailed.map((a) => a.score);
  const completedAttempts = detailed.filter((a) => a.status === 'completed').length;
  const avgScore =
    scores.length > 0 ? Number((scores.reduce((s, n) => s + n, 0) / scores.length).toFixed(1)) : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

  return NextResponse.json({
    totalAttempts: detailed.length,
    completedAttempts,
    avgScore,
    bestScore,
    attempts: detailed,
  });
}
