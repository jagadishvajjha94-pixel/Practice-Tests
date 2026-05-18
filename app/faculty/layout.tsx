import { FacultyShell } from '@/components/faculty/faculty-shell';

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  return <FacultyShell>{children}</FacultyShell>;
}
