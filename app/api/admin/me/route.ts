import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveAppUserById } from '@/lib/roles-prisma';

export async function GET(_request: NextRequest) {
  const session = await auth();
  const user = session?.user;
  if (!user) {
    return NextResponse.json({ isAdmin: false, authenticated: false });
  }
  const resolved = await resolveAppUserById(user.id);
  const isAdmin = resolved?.role === 'admin';

  return NextResponse.json({
    isAdmin,
    authenticated: true,
    role: isAdmin ? 'admin' : null,
    email: user.email,
  });
}
