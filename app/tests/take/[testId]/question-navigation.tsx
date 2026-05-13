'use client';

import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Question } from '@/lib/types';
import { useTest } from './test-context';
import { Button } from '@/components/ui/button';

interface QuestionNavigationProps {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, unknown>;
  /** First unlocked index is 0; indices &gt;= this require sign-in. */
  unlockedCount: number;
  loginHref: string;
}

export default function QuestionNavigation({
  questions,
  currentIndex,
  answers,
  unlockedCount,
  loginHref,
}: QuestionNavigationProps) {
  const { setCurrentQuestionIndex } = useTest();
  const router = useRouter();

  return (
    <div>
      <p className="text-xs font-semibold text-gray-700 uppercase mb-3">Questions</p>
      <div className="grid grid-cols-5 gap-1.5 max-h-[min(60vh,560px)] overflow-y-auto pr-1">
        {questions.map((question, index) => {
          const locked = index >= unlockedCount;
          const record = answers[question.id] as { userAnswer?: unknown; isMarkedForReview?: boolean } | undefined;
          const answered = record?.userAnswer !== null && record?.userAnswer !== undefined;
          const isMarked = record?.isMarkedForReview;
          const isCurrent = index === currentIndex;

          let statusClass = 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-100';
          if (!locked) {
            if (answered && isMarked) statusClass = 'bg-yellow-300 border border-yellow-500 text-yellow-950 hover:bg-yellow-300';
            else if (answered) statusClass = 'bg-green-300 border border-green-500 text-green-950 hover:bg-green-300';
            else if (isMarked) statusClass = 'bg-yellow-300 border border-yellow-500 text-yellow-950 hover:bg-yellow-300';
            if (isCurrent) statusClass += ' ring-2 ring-blue-600 ring-offset-1';
          }

          return (
            <Button
              key={question.id}
              type="button"
              title={locked ? 'Sign in to unlock this question' : `Question ${index + 1}`}
              aria-label={locked ? `Question ${index + 1} locked — sign in to unlock` : `Question ${index + 1}`}
              onClick={() => {
                if (locked) {
                  router.push(loginHref);
                  return;
                }
                setCurrentQuestionIndex(index);
              }}
              variant="outline"
              className={`h-9 min-w-[2.25rem] p-1 text-xs font-semibold rounded-md shadow-sm ${
                locked
                  ? 'cursor-pointer border-gray-400 bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-500'
                  : statusClass
              }`}
            >
              {locked ? <Lock className="mx-auto h-3 w-3" aria-hidden /> : index + 1}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
