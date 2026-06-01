/**
 * Demo accounts for UAT — created via POST /api/setup/seed-demo-users
 * (requires AUTH_SECRET in .env.local).
 */
export const DEMO_STUDENT_ACCOUNTS = [
  {
    rollNumber: '21CS001',
    password: 'Student@2026',
    fullName: 'Arjun Kumar (Demo)',
    department: 'Computer Science Engineering',
    year: 'III Year',
  },
  {
    rollNumber: '21EC002',
    password: 'Student@2026',
    fullName: 'Priya Sharma (Demo)',
    department: 'Electronics & Communication Engineering',
    year: 'II Year',
  },
  {
    rollNumber: '21ME003',
    password: 'Student@2026',
    fullName: 'Rahul Reddy (Demo)',
    department: 'Mechanical Engineering',
    year: 'IV Year',
  },
] as const;

export const DEMO_FACULTY_ACCOUNT = {
  employeeId: 'FAC1001',
  password: 'Faculty@2026',
  fullName: 'Dr. Demo Faculty',
  department: 'Computer Science Engineering',
} as const;
