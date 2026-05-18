import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';

export async function GET() {
  const auth = await requireAuth(['student']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ exams: [] });
  }

  const { data: profile } = await admin
    .from('users')
    .select('branch, academic_year')
    .eq('id', auth.ctx.resolved.id)
    .maybeSingle();

  const department = profile?.branch ?? auth.ctx.resolved.department;
  const year = profile?.academic_year ?? auth.ctx.resolved.academicYear;

  if (!department || !year) {
    return NextResponse.json({ exams: [], message: 'Complete your profile (department and year)' });
  }

  const { data: requests } = await admin
    .from('faculty_exam_requests')
    .select('id, title, description, duration_minutes, target_years, published_test_id, department, created_at')
    .eq('status', 'approved')
    .eq('department', department)
    .not('published_test_id', 'is', null);

  const exams = (requests ?? []).filter((r) => {
    const years = (r.target_years as string[]) ?? [];
    return years.includes(year);
  });

  return NextResponse.json({ exams, department, year });
}
