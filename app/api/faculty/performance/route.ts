import { NextResponse } from 'next/server';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';
import { loadFacultyPerformanceData } from '@/lib/faculty/performance-data';

export async function GET() {
  const auth = await requireAuth(['faculty']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const { data: profile } = await admin
    .from('faculty_profiles')
    .select('department')
    .eq('user_id', auth.ctx.resolved.id)
    .maybeSingle();

  const department = profile?.department ?? auth.ctx.resolved.department;
  if (!department) {
    return NextResponse.json({ error: 'Faculty department not set' }, { status: 400 });
  }

  const payload = await loadFacultyPerformanceData(admin, department);
  return NextResponse.json(payload);
}
