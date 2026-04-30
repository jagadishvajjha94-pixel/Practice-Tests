'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Scenario = {
  id: number;
  prompt: string;
  keywords: string[];
  modelHint: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: 1,
    prompt:
      'You are asked in IELTS speaking: "Should students work part-time during college?" Give a balanced response.',
    keywords: ['advantage', 'disadvantage', 'time management', 'experience'],
    modelHint: 'Present both sides, then give a clear conclusion.',
  },
  {
    id: 2,
    prompt:
      'GRE-style issue response: "Technology makes people less social." State your position and justify it.',
    keywords: ['agree', 'disagree', 'example', 'counterpoint'],
    modelHint: 'Use one real example and one counterargument.',
  },
  {
    id: 3,
    prompt:
      'TOEFL integrated style: "University should make attendance mandatory." Respond with reasons and examples.',
    keywords: ['policy', 'learning outcomes', 'flexibility', 'engagement'],
    modelHint: 'Use structured paragraphs: claim -> reason -> example.',
  },
];

function evaluate(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  const matched = keywords.filter((k) => lower.includes(k.toLowerCase()));
  const coverage = Math.round((matched.length / keywords.length) * 100);
  const band = coverage >= 75 ? 'Strong' : coverage >= 50 ? 'Moderate' : 'Needs improvement';
  return { matched, coverage, band };
}

export default function SituationEnglishPage() {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [report, setReport] = useState<{
    matched: string[];
    coverage: number;
    band: string;
  } | null>(null);

  const scenario = SCENARIOS[index];

  const onEvaluate = () => {
    if (!answer.trim()) return;
    setReport(evaluate(answer, scenario.keywords));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Situation-Based English Practice</h1>
          <Link href="/tests/swarx">
            <Button variant="outline">Back to SWARX</Button>
          </Link>
        </div>

        <Card className="p-6 space-y-4">
          <p className="text-sm text-gray-500">Competitive exam style scenario</p>
          <p className="font-semibold text-gray-900">{scenario.prompt}</p>
          <p className="text-sm text-gray-600">
            Hint: <span className="font-medium">{scenario.modelHint}</span>
          </p>

          <Textarea
            className="min-h-44"
            placeholder="Write your response in English..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />

          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={onEvaluate}
            >
              Evaluate Response
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIndex((p) => (p + 1) % SCENARIOS.length);
                setAnswer('');
                setReport(null);
              }}
            >
              Next Scenario
            </Button>
          </div>
        </Card>

        {report && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Evaluation Summary</h2>
            <p className="text-sm text-gray-700 mb-2">
              Keyword coverage: <strong>{report.coverage}%</strong>
            </p>
            <p className="text-sm text-gray-700 mb-2">
              Performance band: <strong>{report.band}</strong>
            </p>
            <p className="text-sm text-gray-700 mb-2">
              Matched key points: {report.matched.length > 0 ? report.matched.join(', ') : 'None yet'}
            </p>
            <p className="text-xs text-gray-500 mt-3">
              Tip: Aim for clear structure, transition words, and concrete examples.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
