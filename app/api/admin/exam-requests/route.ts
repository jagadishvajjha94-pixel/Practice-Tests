import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';

export async function GET() {
  const auth = await requireAuth(['admin']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const { data, error } = await admin
    .from('faculty_exam_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const facultyIds = [...new Set((data ?? []).map((r) => r.faculty_user_id as string))];
  const { data: profiles } = facultyIds.length
    ? await admin.from('faculty_profiles').select('user_id, full_name, employee_id, department').in('user_id', facultyIds)
    : { data: [] };

  const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id as string, p]));

  const enriched = (data ?? []).map((row) => ({
    ...row,
    faculty: profileByUser.get(row.faculty_user_id as string) ?? null,
  }));

  return NextResponse.json({ requests: enriched });
}
