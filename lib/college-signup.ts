import { COLLEGE } from '@/lib/college-brand';
import { adminAuthEmail, studentAuthEmail } from '@/lib/college-auth';

export type CollegeSignupRole = 'student';

export function isSignupRoleAllowed(role: unknown): role is CollegeSignupRole {
  return role === 'student';
}

/** Admin accounts are provisioned only by examination cell — never public signup. */
export function isPublicSignupEmailAllowed(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) return false;
  const adminEmail = adminAuthEmail('blocked');
  const adminDomain = adminEmail.split('@')[1];
  if (normalized.endsWith(`@${adminDomain}`)) return false;
  if (normalized.includes('@admin.')) return false;
  if (normalized.includes('@faculty.')) return false;
  return true;
}

export function collegeSignupEmail(role: CollegeSignupRole, identifier: string): string {
  return studentAuthEmail(identifier);
}

export function collegeEmailDomainHint(_role: CollegeSignupRole): string {
  return `student.${COLLEGE.emailDomain}`;
}
