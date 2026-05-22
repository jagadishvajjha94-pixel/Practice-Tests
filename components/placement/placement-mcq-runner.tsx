'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { PlacementMcqAnswerMap, PlacementSectionId } from '@/lib/placement/types';
import type { Question } from '@/lib/types';

export function PlacementMcqRunner({
  sectionId,
  questions,
  answers,
  onAnswerChange,
}: {
  sectionId: PlacementSectionId;
  questions: Question[];
  answers: PlacementMcqAnswerMap;
  onAnswerChange: (questionId: string, value: string | null) => void;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [sectionId, questions.length]);

  const safeIndex = questions.length ? Math.min(index, questions.length - 1) : 0;
  const current = questions[safeIndex];
  const answeredCount = Object.values(answers).filter(Boolean).length;

  if (!current) {
    return (
      <Card className="p-6 text-center text-slate-600">
        No questions available for this section.
      </Card>
    );
  }

  const options: Array<{ letter: 'A' | 'B' | 'C' | 'D'; text: string | null | undefined }> = [
    { letter: 'A', text: current.option_a },
    { letter: 'B', text: current.option_b },
    { letter: 'C', text: current.option_c },
    { letter: 'D', text: current.option_d },
  ];

  const selected = answers[current.id] ?? null;

  return (
    <div className="grid md:grid-cols-4 gap-4">
      <div className="md:col-span-3 space-y-4">
        <Card className="p-5 border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Question {safeIndex + 1} of {questions.length}
            </p>
            {selected ? (
              <span className="text-xs font-semibold text-emerald-700">Answered</span>
            ) : (
              <span className="text-xs font-semibold text-slate-500">Unanswered</span>
            )}
          </div>
          <Progress value={((safeIndex + 1) / questions.length) * 100} className="h-1 mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-4 whitespace-pre-wrap leading-snug">
            {current.question_text}
          </h2>
          <div className="space-y-2">
            {options
              .filter((o) => o.text != null && String(o.text).trim() !== '')
              .map(({ letter, text }) => {
                const active = selected === letter;
                return (
                  <label
                    key={letter}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border-2 p-3 cursor-pointer transition',
                      active
                        ? 'border-[#1e3a5f] bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    <input
                      type="radio"
                      name={`q-${current.id}`}
                      value={letter}
                      checked={active}
                      onChange={() => onAnswerChange(current.id, letter)}
                      className="mt-1"
                    />
                    <span className="text-sm text-slate-900">
                      <strong className="text-[#1e3a5f] mr-2">{letter}.</strong>
                      {text}
                    </span>
                  </label>
                );
              })}
          </div>
          <div className="flex gap-2 mt-5">
            <Button
              variant="outline"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={safeIndex === 0}
              className="flex-1"
            >
              ← Previous
            </Button>
            {selected ? (
              <Button
                variant="ghost"
                className="text-slate-600"
                onClick={() => onAnswerChange(current.id, null)}
              >
                Clear
              </Button>
            ) : null}
            <Button
              onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
              disabled={safeIndex >= questions.length - 1}
              className="flex-1"
            >
              Next →
            </Button>
          </div>
        </Card>
      </div>

      <div className="md:col-span-1">
        <Card className="p-4 border-slate-200 shadow-sm md:sticky md:top-28">
          <h3 className="font-semibold text-slate-900 mb-3 text-sm">Section status</h3>
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-emerald-700">✓ Answered</span>
              <span className="font-semibold text-slate-900">{answeredCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">○ Unanswered</span>
              <span className="font-semibold text-slate-900">{questions.length - answeredCount}</span>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-900 mb-3">Questions</p>
            <div className="grid grid-cols-5 gap-1.5 max-h-[min(50vh,420px)] overflow-y-auto pr-0.5">
              {questions.map((q, i) => {
                const isCurrent = i === safeIndex;
                const isAnswered = Boolean(answers[q.id]);
                return (
                  <Button
                    key={q.id}
                    type="button"
                    variant="ghost"
                    onClick={() => setIndex(i)}
                    className={cn(
                      'h-9 min-w-[2.25rem] p-1 text-xs font-bold tabular-nums rounded-md border-2',
                      isCurrent
                        ? 'z-[1] ring-[3px] ring-blue-600 ring-offset-2 border-[#1e3a5f] bg-[#1e3a5f] text-white'
                        : isAnswered
                          ? 'border-emerald-800 bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'border-slate-400 bg-slate-100 text-slate-950 hover:bg-slate-200',
                    )}
                  >
                    {i + 1}
                  </Button>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
