import Credentials from 'next-auth/providers/credentials';
import type { Provider } from 'next-auth/providers';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import {
  adminAuthEmail,
  studentAuthEmail,
  validatePassword,
  validateRollNumber,
} from '@/lib/college-auth';

export type AppRole = 'admin' | 'student';

export function buildAuthProviders(): Provider[] {
  return [
    Credentials({
      id: 'student',
      name: 'Student',
      credentials: {
        rollNumber: { label: 'Roll number', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const roll = String(credentials?.rollNumber ?? '').trim();
        const password = String(credentials?.password ?? '');
        const rollErr = validateRollNumber(roll);
        const passErr = validatePassword(password);
        if (rollErr || passErr) return null;

        const email = studentAuthEmail(roll);
        const user = await prisma.user.findFirst({
          where: {
            OR: [{ rollNumber: roll.replace(/\s+/g, '') }, { email }],
          },
          include: { adminUser: true },
        });

        if (!user?.passwordHash || user.adminUser) return null;
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.fullName ?? roll,
          role: 'student' as const,
        };
      },
    }),
    Credentials({
      id: 'admin',
      name: 'Admin',
      credentials: {
        username: { label: 'Username or email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? '').trim();
        const password = String(credentials?.password ?? '');
        if (!username || validatePassword(password)) return null;

        const email = adminAuthEmail(username);
        const user = await prisma.user.findUnique({
          where: { email },
          include: { adminUser: true },
        });

        if (!user?.passwordHash || !user.adminUser) return null;
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.fullName ?? username,
          role: 'admin' as const,
        };
      },
    }),
  ];
}
