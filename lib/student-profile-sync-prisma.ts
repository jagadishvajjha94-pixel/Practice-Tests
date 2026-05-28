import { COLLEGE } from '@/lib/college-brand';
import { prisma } from '@/lib/prisma';
import type { StudentProfileFields } from '@/lib/student-profile-sync';
import { studentFieldsFromMetadata } from '@/lib/student-profile-sync';
import { studentAuthEmail } from '@/lib/college-auth';
import { normalizeRoll } from '@/lib/exam-schedule-slots';

export async function ensureStudentProfileRowPrisma(
  userId: string,
  fields: StudentProfileFields & { roll_number?: string | null },
): Promise<StudentProfileFields> {
  const email = fields.email?.trim().toLowerCase();
  if (!email) {
    throw new Error('Student email is required');
  }

  const roll =
    fields.roll_number?.trim() ||
    normalizeRoll(email.split('@')[0] ?? '') ||
    null;

  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email,
      fullName: fields.full_name ?? roll ?? 'Student',
      branch: fields.branch,
      academicYear: fields.academic_year,
      rollNumber: roll ? roll.replace(/\s+/g, '') : null,
      college: COLLEGE.shortName,
      subscriptionStatus: 'free',
    },
    update: {
      email,
      fullName: fields.full_name ?? undefined,
      branch: fields.branch ?? undefined,
      academicYear: fields.academic_year ?? undefined,
      rollNumber: roll ? roll.replace(/\s+/g, '') : undefined,
      college: COLLEGE.shortName,
    },
  });

  return fields;
}

export function studentSignupFields(
  metadata: Record<string, string>,
  email: string,
  fullName: string,
): StudentProfileFields & { roll_number: string | null } {
  const fields = studentFieldsFromMetadata(metadata, email);
  const roll =
    metadata.roll_number?.trim() ||
    normalizeRoll(email.split('@')[0] ?? '') ||
    null;
  return {
    ...fields,
    full_name: fields.full_name ?? fullName,
    roll_number: roll,
  };
}

export function resolveSignupEmail(rawEmail: string, metadata: Record<string, string>): string {
  const trimmed = rawEmail.trim().toLowerCase();
  if (trimmed.includes('@')) return trimmed;
  const roll = metadata.roll_number?.trim() || trimmed;
  return studentAuthEmail(roll);
}
