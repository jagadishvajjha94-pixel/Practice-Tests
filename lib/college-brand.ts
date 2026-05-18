/** Ramachandra College internal assessment — branding constants. */
export const COLLEGE = {
  name: 'RAMACHANDRA COLLEGE OF ENGINEERING',
  shortName: 'Ramachandra College',
  rce: 'RCE',
  /** Shown on landing page, login screens, and site header */
  departmentTitle: 'Training & Placement Department',
  portalSubtitle: 'Online Assessment Platform for Student Skill Evaluation',
  emailDomain: 'ramachandra.edu',
} as const;

/** @deprecated Use departmentTitle */
export const portalTitle = COLLEGE.departmentTitle;

export const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Information Technology',
  'Master of Business Administration',
] as const;

export const ACADEMIC_YEARS = ['I Year', 'II Year', 'III Year', 'IV Year'] as const;

export type Department = (typeof DEPARTMENTS)[number];
export type AcademicYear = (typeof ACADEMIC_YEARS)[number];
