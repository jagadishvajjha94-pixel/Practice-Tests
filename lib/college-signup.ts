import { COLLEGE } from '@/lib/college-brand';
import { adminAuthEmail, facultyAuthEmail, studentAuthEmail } from '@/lib/college-auth';

export type CollegeSignupRole = 'student' | 'faculty';

export function isSignupRoleAllowed(role: unknown): role is CollegeSignupRole {
  return role === 'student' || role === 'faculty';
}

/** Admin accounts are provisioned only by examination cell — never public signup. */
export function isPublicSignupEmailAllowed(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) return false;
  const adminEmail = adminAuthEmail('blocked');
  const adminDomain = adminEmail.split('@')[1];
  if (normalized.endsWith(`@${adminDomain}`)) return false;
  if (normalized.includes('@admin.')) return false;
  return true;
}

export function collegeSignupEmail(role: CollegeSignupRole, identifier: string): string {
  if (role === 'student') return studentAuthEmail(identifier);
  return facultyAuthEmail(identifier);
}

export function collegeEmailDomainHint(role: CollegeSignupRole): string {
  return role === 'student' ? `student.${COLLEGE.emailDomain}` : `faculty.${COLLEGE.emailDomain}`;
}
