import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/auth';
import { ensureAdminUser } from '@/lib/roles-prisma';
import { DEFAULT_ADMIN_EMAIL } from '@/lib/admin-defaults';
import { adminAuthEmail } from '@/lib/college-auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; username?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const emailInput = (body.email ?? body.username ?? '').trim().toLowerCase();
  const password = body.password ?? '';

  if (!emailInput || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const result = await signIn('admin', {
    username: emailInput,
    password,
    redirect: false,
  });

  if (result?.error) {
    const hint =
      emailInput !== DEFAULT_ADMIN_EMAIL
        ? ` Use the admin email issued by the examination cell (e.g. ${DEFAULT_ADMIN_EMAIL}).`
        : ' Contact the examination cell if you need access.';
    return NextResponse.json(
      {
        error: 'Invalid email or password.',
        hint,
        attemptedEmail: emailInput,
      },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: adminAuthEmail(emailInput) },
    select: { id: true, email: true },
  });

  if (user) {
    await ensureAdminUser(user.id);
  }

  return NextResponse.json({
    success: true,
    email: user?.email ?? emailInput,
    userId: user?.id,
  });
}
