import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'SWARX Communication — RCE',
  description: 'Communication and interview readiness modules inside one portal',
};

export default function SwarxTestsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="app-page-header">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-3 text-[#0c2340]">SWARX Communication</h1>
          <p className="text-slate-700 text-lg font-medium">
            One login, one portal: communication training and placement readiness modules
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Vocal Communication Practice</h2>
          <p className="text-slate-700 mb-6">
            Speak in English on exam-style prompts and get fluency, grammar, and confidence scoring.
          </p>
          <Link href="/ai/communication-practice">
            <Button>Start Vocal Practice</Button>
          </Link>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">English Grammar Test</h2>
          <p className="text-slate-700 mb-6">
            Practice grammar questions with explanations aligned to competitive exam standards.
          </p>
          <Link href="/ai/grammar-tests">
            <Button>Start Grammar Test</Button>
          </Link>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Situation-Based English</h2>
          <p className="text-slate-700 mb-6">
            Solve IELTS/TOEFL/GRE-style scenario questions in English with structured evaluation.
          </p>
          <Link href="/ai/situation-english">
            <Button>Start Scenario Practice</Button>
          </Link>
        </Card>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-12">
        <Card className="p-6 border border-[#1e3a5f]/25 bg-blue-50/60">
          <p className="text-sm text-slate-800">
            <strong className="text-slate-900">AI Interview</strong> (resume + voice interview) is a separate module — not part of SWARX.{' '}
            <Link href="/ai/interview" className="text-[#1e3a5f] font-semibold hover:underline">
              Open AI Interview Studio →
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
