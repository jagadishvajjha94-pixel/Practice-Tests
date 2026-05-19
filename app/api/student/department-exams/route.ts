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
    return NextResponse.json({
      exams: [],
      message: 'Complete your profile (department and year)',
    });
  }

  // Approved exams whose primary department matches OR whose target_branches
  // include the student's branch — both filtered to the student's year.
  const { data: requests } = await admin
    .from('faculty_exam_requests')
    .select(
      'id, title, topic, description, duration_minutes, target_years, target_branches, published_test_id, department, created_at',
    )
    .eq('status', 'approved')
    .not('published_test_id', 'is', null);

  const exams = (requests ?? []).filter((r) => {
    const years = (r.target_years as string[]) ?? [];
    if (!years.includes(year)) return false;
    if (r.department === department) return true;
    const branches = (r.target_branches as string[]) ?? [];
    return branches.includes(department);
  });

  return NextResponse.json({ exams, department, year });
}
