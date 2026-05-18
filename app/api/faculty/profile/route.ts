import { NextRequest, NextResponse } from 'next/server';
import { isValidDepartment } from '@/lib/roles';
import { requireAuth, getServiceSupabase } from '@/lib/server-auth';

export async function GET() {
  const auth = await requireAuth(['faculty']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  const { resolved } = auth.ctx;

  if (!admin) {
    return NextResponse.json({
      department: resolved.department,
      employee_id: resolved.employeeId,
    });
  }

  const { data } = await admin
    .from('faculty_profiles')
    .select('department, employee_id, full_name')
    .eq('user_id', resolved.id)
    .maybeSingle();

  return NextResponse.json({
    department: data?.department ?? resolved.department,
    employee_id: data?.employee_id ?? resolved.employeeId,
    full_name: data?.full_name,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(['faculty']);
  if ('response' in auth) return auth.response;

  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  let body: { department?: string; employee_id?: string; full_name?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const department = body.department?.trim();
  if (!department || !isValidDepartment(department)) {
    return NextResponse.json({ error: 'Valid department is required' }, { status: 400 });
  }

  const { resolved, user } = auth.ctx;
  const meta = (await auth.ctx.supabase.auth.getUser()).data.user?.user_metadata ?? {};

  const { error } = await admin.from('faculty_profiles').upsert(
    {
      user_id: resolved.id,
      department,
      employee_id: body.employee_id?.trim() ?? resolved.employeeId ?? (meta.employee_id as string),
      full_name: body.full_name?.trim() ?? (meta.full_name as string),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...meta, role: 'faculty', department },
  });

  return NextResponse.json({ ok: true, department });
}
