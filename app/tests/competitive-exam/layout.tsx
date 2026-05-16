import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All India Competitive Paper | PrepIndia',
  description:
    '60 MCQs in 90 minutes — Maths, Science, Chemistry, Aptitude, Reasoning, Logic, English, Computer — stratified, unique within sitting.',
};

export default function CompetitiveExamLayout({ children }: { children: React.ReactNode }) {
  return children;
}
