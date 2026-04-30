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
      <div className="grid grid-cols-5 gap-1">
        {questions.map((question, index) => {
          const answered = answers[question.id]?.userAnswer !== null && answers[question.id]?.userAnswer !== undefined;
          const isMarked = answers[question.id]?.isMarkedForReview;
          const isCurrent = index === currentIndex;

          let bgColor = 'bg-white border border-gray-300';
          if (answered && isMarked) bgColor = 'bg-yellow-100 border border-yellow-400';
          else if (answered) bgColor = 'bg-green-100 border border-green-400';
          else if (isMarked) bgColor = 'bg-yellow-100 border border-yellow-400';
          if (isCurrent) bgColor += ' ring-2 ring-blue-500';

          return (
            <Button
              key={question.id}
              onClick={() => setCurrentQuestionIndex(index)}
              variant="outline"
              className={`h-8 w-8 p-0 text-xs font-medium rounded ${bgColor}`}
            >
              {index + 1}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
