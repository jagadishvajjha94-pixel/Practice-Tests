import { ProgrammingGated } from './programming-gated';

export const metadata = {
  title: 'Programming Test — RCE',
  description: 'Timed programming assessment with Monaco editor and 7 languages.',
};

export default function ProgrammingTestPage() {
  return <ProgrammingGated />;
}
