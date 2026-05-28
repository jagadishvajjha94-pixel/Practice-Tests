import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveAppUserById } from '@/lib/roles-prisma';

export async function POST() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolved = await resolveAppUserById(user.id);
  if (!resolved || resolved.role !== 'admin') {
    return NextResponse.json(
      {
        isAdmin: false,
        email: user.email,
        error:
          'This account does not have admin access. Contact the examination cell if you need access.',
      },
      { status: 403 },
    );
  }

  return NextResponse.json({ isAdmin: true, email: user.email });
}
