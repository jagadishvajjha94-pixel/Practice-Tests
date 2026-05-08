'use client';

import { Question } from '@/lib/types';
import { useTest } from './test-context';
import { Button } from '@/components/ui/button';

interface QuestionNavigationProps {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, any>;
}

export default function QuestionNavigation({
  questions,
  currentIndex,
  answers,
}: QuestionNavigationProps) {
  const { setCurrentQuestionIndex } = useTest();

  return (
    <div>
      <p className="text-xs font-semibold text-gray-700 uppercase mb-3">Questions</p>
      <div className="grid grid-cols-5 gap-1.5 max-h-[min(60vh,560px)] overflow-y-auto pr-1">
        {questions.map((question, index) => {
          const answered = answers[question.id]?.userAnswer !== null && answers[question.id]?.userAnswer !== undefined;
          const isMarked = answers[question.id]?.isMarkedForReview;
          const isCurrent = index === currentIndex;

          let statusClass = 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-100';
          if (answered && isMarked) statusClass = 'bg-yellow-300 border border-yellow-500 text-yellow-950 hover:bg-yellow-300';
          else if (answered) statusClass = 'bg-green-300 border border-green-500 text-green-950 hover:bg-green-300';
          else if (isMarked) statusClass = 'bg-yellow-300 border border-yellow-500 text-yellow-950 hover:bg-yellow-300';
          if (isCurrent) statusClass += ' ring-2 ring-blue-600 ring-offset-1';

          return (
            <Button
              key={question.id}
              onClick={() => setCurrentQuestionIndex(index)}
              variant="outline"
              className={`h-9 w-9 p-0 text-xs font-semibold rounded-md shadow-sm ${statusClass}`}
            >
              {index + 1}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
