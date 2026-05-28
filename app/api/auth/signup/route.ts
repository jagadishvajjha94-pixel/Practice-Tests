import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { isSignupDisabled } from '@/lib/auth-features';
import {
  isPublicSignupEmailAllowed,
  isSignupRoleAllowed,
  type CollegeSignupRole,
} from '@/lib/college-signup';
import { COLLEGE } from '@/lib/college-brand';
import {
  ensureStudentProfileRowPrisma,
  resolveSignupEmail,
  studentSignupFields,
} from '@/lib/student-profile-sync-prisma';

type SignupBody = {
  email?: string;
  password?: string;
  fullName?: string;
  next?: string;
  role?: string;
  metadata?: Record<string, string>;
};

function safeNextPath(next: unknown): string {
  if (typeof next !== 'string') return '/dashboard';
  const trimmed = next.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/dashboard';
  return trimmed;
}

export async function POST(request: NextRequest) {
  if (isSignupDisabled()) {
    return NextResponse.json(
      {
        error:
          'New registrations are closed right now. Please sign in with the account you were given.',
      },
      { status: 403 },
    );
  }

  let body: SignupBody;
  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const rawEmail = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';
  const fullName = body.fullName?.trim();
  const role = body.role as CollegeSignupRole | undefined;
  const metadata = body.metadata ?? {};

  if (!rawEmail || !password || !fullName) {
    return NextResponse.json({ error: 'Email, password, and full name are required.' }, { status: 400 });
  }

  const email = resolveSignupEmail(rawEmail, metadata);

  if (role && !isSignupRoleAllowed(role)) {
    return NextResponse.json(
      { error: 'Admin accounts cannot be created online. Contact the examination cell.' },
      { status: 403 },
    );
  }

  if (!isPublicSignupEmailAllowed(email)) {
    return NextResponse.json(
      { error: 'Admin accounts cannot be created online. Contact the examination cell.' },
      { status: 403 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  const next = safeNextPath(body.next);
  void next;

  try {
    const passwordHash = await hashPassword(password);
    const profileFields = studentSignupFields(metadata, email, fullName);
    const rollNumber = profileFields.roll_number?.replace(/\s+/g, '') || null;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(rollNumber ? [{ rollNumber }] : []),
        ],
      },
      include: { adminUser: true },
    });

    if (existing?.adminUser) {
      return NextResponse.json(
        { error: 'Admin accounts cannot be created online. Contact the examination cell.' },
        { status: 403 },
      );
    }

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          fullName: profileFields.full_name ?? fullName,
          branch: profileFields.branch ?? undefined,
          academicYear: profileFields.academic_year ?? undefined,
          rollNumber: rollNumber ?? undefined,
          email,
        },
      });

      if (role === 'student') {
        await ensureStudentProfileRowPrisma(existing.id, profileFields);
      }

      return NextResponse.json({
        ok: true,
        user_id: existing.id,
        email_confirmed: true,
        recovered_existing: true,
      });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: profileFields.full_name ?? fullName,
        branch: profileFields.branch,
        academicYear: profileFields.academic_year,
        rollNumber,
        college: COLLEGE.shortName,
        subscriptionStatus: 'free',
      },
    });

    if (role === 'student') {
      await ensureStudentProfileRowPrisma(user.id, profileFields);
    }

    return NextResponse.json({ ok: true, user_id: user.id, email_confirmed: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign up failed.';
    const normalized = message.toLowerCase();
    if (normalized.includes('unique') || normalized.includes('duplicate')) {
      return NextResponse.json(
        { error: 'This email is already registered. Please sign in instead.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
