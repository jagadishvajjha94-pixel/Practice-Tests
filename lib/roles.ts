import type { SupabaseClient } from '@supabase/supabase-js';
import { isAllowlistedAdminEmail } from '@/lib/admin-defaults';
import { DEPARTMENTS, ACADEMIC_YEARS, type Department, type AcademicYear } from '@/lib/college-brand';

export type AppRole = 'student' | 'admin' | 'guest';

export type ResolvedUser = {
  id: string;
  email: string;
  role: AppRole;
  department?: string | null;
  academicYear?: string | null;
  employeeId?: string | null;
};

export const STUDENT_ONLY_PREFIXES = [
  '/exams',
  '/home',
  '/dashboard',
  '/tests/take',
  '/tests/programming',
  '/tests/competitive-exam/take',
  '/tests/result',
  '/tests/psychometric',
  '/tests/swarx',
  '/ai/',
  '/practice',
  '/coding',
  '/checkout',
  '/pricing',
] as const;

export const ADMIN_PREFIX = '/admin';

export function isStudentExperienceRoute(pathname: string): boolean {
  if (pathname === '/tests') return true;
  if (pathname.startsWith('/tests/department')) return true;
  if (pathname.startsWith('/tests/')) {
    if (pathname.startsWith('/tests/take')) return true;
    if (pathname.startsWith('/tests/result')) return true;
    if (pathname.startsWith('/tests/competitive-exam/take')) return true;
    if (pathname.startsWith('/tests/programming')) return true;
    return false;
  }
  return STUDENT_ONLY_PREFIXES.some(
    (p) => pathname === p || (p.endsWith('/') ? pathname.slice(0, -1) === pathname : pathname.startsWith(p)),
  );
}

export function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith(ADMIN_PREFIX);
}

type AuthUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

export async function resolveAppUserFromAuthUser(
  supabase: SupabaseClient,
  user: AuthUserLike,
): Promise<ResolvedUser | null> {
  if (!user?.id) return null;

  const email = user.email ?? '';
  const meta = user.user_metadata ?? {};

  const { data: adminRow, error: adminError } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!adminError && adminRow) {
    return {
      id: user.id,
      email,
      role: 'admin',
    };
  }

  if (String(meta.role ?? '') === 'admin') {
    return {
      id: user.id,
      email,
      role: 'admin',
    };
  }

  const allowlisted = isAllowlistedAdminEmail(user.email);

  if (allowlisted && adminError) {
    const errMsg = String(adminError.message ?? '').toLowerCase();
    if (errMsg.includes('admin_users') || errMsg.includes('schema cache')) {
      return {
        id: user.id,
        email,
        role: 'admin',
      };
    }
  }
  const metaRole = String(meta.role ?? '');

  if (metaRole === 'faculty') {
    return {
      id: user.id,
      email,
      role: 'student',
      department: (meta.department as string) ?? null,
    };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('branch, academic_year, full_name')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email,
    role: 'student',
    department: profile?.branch ?? (meta.department as string) ?? null,
    academicYear: profile?.academic_year ?? (meta.year as string) ?? null,
  };
}

export async function resolveAppUser(supabase: SupabaseClient): Promise<ResolvedUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return null;
  return resolveAppUserFromAuthUser(supabase, user);
}

export function isValidDepartment(value: string): value is Department {
  return (DEPARTMENTS as readonly string[]).includes(value);
}

export function isValidAcademicYear(value: string): value is AcademicYear {
  return (ACADEMIC_YEARS as readonly string[]).includes(value);
}

export function defaultRedirectForRole(role: AppRole): string {
  if (role === 'admin') return '/admin/dashboard';
  return '/exams';
}
