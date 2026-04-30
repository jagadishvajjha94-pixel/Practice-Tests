import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'SWARX Communication - PrepIndia',
  description: 'Communication and interview readiness modules inside one portal',
};

export default function SwarxTestsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-3">SWARX Communication</h1>
          <p className="text-blue-100 text-lg">
            One login, one portal: communication training and placement readiness modules
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Vocal Communication Practice</h2>
          <p className="text-gray-600 mb-6">
            Speak in English on exam-style prompts and get fluency, grammar, and confidence scoring.
          </p>
          <Link href="/ai/communication-practice">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Start Vocal Practice</Button>
          </Link>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">English Grammar Test</h2>
          <p className="text-gray-600 mb-6">
            Practice grammar questions with explanations aligned to competitive exam standards.
          </p>
          <Link href="/ai/grammar-tests">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Start Grammar Test</Button>
          </Link>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Situation-Based English</h2>
          <p className="text-gray-600 mb-6">
            Solve IELTS/TOEFL/GRE-style scenario questions in English with structured evaluation.
          </p>
          <Link href="/ai/situation-english">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Start Scenario Practice</Button>
          </Link>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">AI Mock Interview</h2>
          <p className="text-gray-600 mb-6">
            Practice interview rounds with guided prompts and instant feedback.
          </p>
          <Link href="/ai/mock-interview">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Start Mock Interview</Button>
          </Link>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">AI Resume Review</h2>
          <p className="text-gray-600 mb-6">
            Upload your resume and get structured feedback with improvement recommendations.
          </p>
          <Link href="/ai/resume-review">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Start Resume Review</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
