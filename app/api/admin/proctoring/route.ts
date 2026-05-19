import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';

export async function GET() {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const { data: violations } = await admin
    .from('exam_violations')
    .select('id, user_id, test_id, attempt_id, violation_type, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(300);

  const userIds = [...new Set((violations ?? []).map((v) => v.user_id).filter(Boolean))] as string[];
  const { data: users } = userIds.length
    ? await admin.from('users').select('id, email, full_name, branch').in('id', userIds)
    : { data: [] };

  const userMap = new Map((users ?? []).map((u) => [u.id as string, u]));

  const rows = (violations ?? []).map((row) => {
    const u = userMap.get(row.user_id as string);
    return {
      ...row,
      email: (u?.email as string) ?? null,
      full_name: (u?.full_name as string) ?? null,
      branch: (u?.branch as string) ?? null,
    };
  });

  const byType = rows.reduce<Record<string, number>>((acc, row) => {
    const t = String(row.violation_type);
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    violations: rows,
    summary: {
      total: rows.length,
      byType,
      studentsFlagged: userIds.length,
      autoSubmits: byType.auto_submit_violations ?? 0,
    },
  });
}
