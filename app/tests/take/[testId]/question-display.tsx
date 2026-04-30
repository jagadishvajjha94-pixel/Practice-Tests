'use client';

import { Question } from '@/lib/types';
import { useTest } from './test-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface QuestionDisplayProps {
  question: Question;
}

export default function QuestionDisplay({ question }: QuestionDisplayProps) {
  const { answers, setAnswer, markForReview } = useTest();
  const currentAnswer = answers[question.id]?.userAnswer;
  const isMarked = answers[question.id]?.isMarkedForReview || false;

  const handleAnswerChange = (value: string) => {
    setAnswer(question.id, value);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-6">{question.question_text}</h2>

      {/* Question Options */}
      <div className="space-y-3 mb-8">
        {question.type === 'MCQ' && (question.question_type === 'mcq' || question.option_a != null || question.option_b != null) && (
          <>
            {( [
              ['A', question.option_a],
              ['B', question.option_b],
              ['C', question.option_c],
              ['D', question.option_d],
            ].filter(([, text]) => text != null && String(text).trim() !== '') as [string, string][]).map(([letter, text]) => (
              <label key={letter} className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition" style={{
                borderColor: currentAnswer === letter ? '#3B82F6' : undefined,
                backgroundColor: currentAnswer === letter ? '#F0F9FF' : undefined,
              }}>
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={letter}
                  checked={currentAnswer === letter}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="ml-3 text-gray-900">
                  <span className="font-semibold">{letter}. </span>{text}
                </span>
              </label>
            ))}
          </>
        )}

        {question.type === 'MCQ' && question.options && !(question.question_type === 'mcq' || question.option_a != null || question.option_b != null) && (
          <>
            {question.options.map((option, index) => (
              <label key={index} className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition" style={{
                borderColor: currentAnswer === option ? '#3B82F6' : undefined,
                backgroundColor: currentAnswer === option ? '#F0F9FF' : undefined,
              }}>
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="ml-3 text-gray-900">{option}</span>
              </label>
            ))}
          </>
        )}

        {question.type === 'numeric' && (
          <div>
            <Input
              type="number"
              value={currentAnswer || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Enter your answer"
              className="text-lg p-3"
            />
          </div>
        )}

        {question.type === 'verbal' && (
          <textarea
            value={currentAnswer || ''}
            onChange={(e) => handleAnswerChange(e.target.value)}
            placeholder="Enter your answer"
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none min-h-24"
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <Button
          onClick={() => markForReview(question.id, !isMarked)}
          variant="outline"
          className="flex-1"
        >
          {isMarked ? '⚑ Marked for Review' : '○ Mark for Review'}
        </Button>
      </div>
    </div>
  );
}
