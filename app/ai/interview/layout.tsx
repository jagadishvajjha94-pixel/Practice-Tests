import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Interview — PrepIndia',
  description: 'Voice-powered AI interview with resume review and personalized questions.',
};

export default function AiInterviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
