import { ProgrammingExamWorkspace } from '@/components/coding/programming-exam-workspace';

export const metadata = {
  title: 'Programming Test — RCE',
  description: 'Timed programming assessment with Monaco editor and 7 languages.',
};

export default function ProgrammingTestPage() {
  return <ProgrammingExamWorkspace />;
}
