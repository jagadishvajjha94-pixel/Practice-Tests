export const ADMIN_NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Overview', description: 'College-wide performance and exports' },
  { href: '/admin/approvals', label: 'Faculty approvals', description: 'Review and publish faculty exams' },
  { href: '/admin/exam-builder', label: 'Exam builder', description: 'Create syllabus exams — test type, topics, and slot' },
  { href: '/admin/rmset', label: 'RMSET', description: 'Select topics and publish the eligibility test paper' },
  { href: '/admin/evalora-modules', label: 'ElevateX & modules', description: 'Go live with ElevateX and other scheduled assessments' },
  { href: '/admin/exam-schedules', label: 'Faculty exam schedules', description: 'Go live on individual faculty department exams' },
  { href: '/admin/questions', label: 'Questions', description: 'Question bank and MCQ management' },
  { href: '/admin/tests', label: 'Test attempts', description: 'Monitor tests and student submissions' },
  { href: '/admin/users', label: 'Users', description: 'Registered students and profiles' },
  { href: '/admin/ai-generator', label: 'AI generator', description: 'Generate MCQs with AI' },
  { href: '/admin/proctoring', label: 'Proctoring', description: 'Exam integrity and session flags' },
] as const;

export type AdminNavHref = (typeof ADMIN_NAV_ITEMS)[number]['href'];
