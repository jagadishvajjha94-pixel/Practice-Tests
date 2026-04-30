'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Question = {
  id: number;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

const QUESTIONS: Question[] = [
  {
    id: 1,
    question: 'Choose the correct sentence:',
    options: [
      'Neither of the students have completed the test.',
      'Neither of the students has completed the test.',
      'Neither of the students are completed the test.',
      'Neither of the student has completed the test.',
    ],
    answer: 1,
    explanation: '"Neither" takes a singular verb: "has".',
  },
  {
    id: 2,
    question: 'Select the best transition word: "The data was limited; ___, the results were useful."',
    options: ['however', 'therefore', 'because', 'unless'],
    answer: 0,
    explanation: 'The sentence shows contrast, so "however" is correct.',
  },
  {
    id: 3,
    question: 'Pick the correct form:',
    options: [
      'If I would have known, I would help.',
      'If I had known, I would have helped.',
      'If I knew, I would have helped yesterday.',
      'If I know, I would have helped.',
    ],
    answer: 1,
    explanation: 'This is a third conditional sentence (past unreal).',
  },
  {
    id: 4,
    question: 'Identify the grammatically correct option:',
    options: [
      'Each of the participants were given a badge.',
      'Each of the participants was given a badge.',
      'Each participants was given a badge.',
      'Each of participant was given a badge.',
    ],
    answer: 1,
    explanation: '"Each" is singular, so use "was".',
  },
  {
    id: 5,
    question: 'Choose the best academic rewrite:',
    options: [
      'Kids these days are kinda addicted to phones.',
      'Many students are increasingly dependent on smartphones.',
      'Students and phones are too much these days.',
      'Phones are bad and students use them all time.',
    ],
    answer: 1,
    explanation: 'Option 2 is formal and precise.',
  },
];

export default function GrammarTestsPage() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => {
    let s = 0;
    for (const q of QUESTIONS) if (answers[q.id] === q.answer) s++;
    return s;
  }, [answers]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">English Grammar Test</h1>
          <Link href="/tests/swarx">
            <Button variant="outline">Back to SWARX</Button>
          </Link>
        </div>

        <Card className="p-6 space-y-6">
          {QUESTIONS.map((q, idx) => (
            <div key={q.id} className="border-b border-gray-200 pb-4 last:border-b-0">
              <p className="font-semibold text-gray-900 mb-3">
                {idx + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, i) => (
                  <label key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={answers[q.id] === i}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              {submitted && (
                <p
                  className={`mt-2 text-sm ${
                    answers[q.id] === q.answer ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {answers[q.id] === q.answer ? 'Correct.' : `Incorrect. ${q.explanation}`}
                </p>
              )}
            </div>
          ))}

          <div className="flex gap-2">
            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setSubmitted(true)}
            >
              Submit Grammar Test
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
              }}
            >
              Reset
            </Button>
          </div>

          {submitted && (
            <div className="p-4 rounded-lg bg-blue-50 text-blue-900">
              Score: <strong>{score}</strong> / {QUESTIONS.length}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
