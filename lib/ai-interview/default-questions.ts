import type { InterviewQuestion } from '@/lib/ai-interview/types';

export const DEFAULT_INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    question: 'Tell me about yourself and your background.',
    expectedKeywords: ['experience', 'education', 'skills'],
    feedback: 'Good start. Add one measurable achievement from your resume.',
  },
  {
    question: 'What are your key strengths and how do they benefit this role?',
    expectedKeywords: ['strengths', 'skills', 'relevant', 'experience'],
    feedback: 'Link each strength to a concrete example from your resume.',
  },
  {
    question: 'Describe a challenging project you worked on and how you solved it.',
    expectedKeywords: ['problem', 'solution', 'results', 'learning'],
    feedback: 'Use STAR: Situation, Task, Action, Result with numbers.',
  },
  {
    question: 'What do you know about our company and why do you want to join?',
    expectedKeywords: ['company', 'mission', 'products', 'culture', 'values'],
    feedback: 'Mention one specific product, value, or recent news about the company.',
  },
  {
    question: 'Where do you see yourself in three to five years?',
    expectedKeywords: ['growth', 'development', 'goals', 'responsibility'],
    feedback: 'Show ambition aligned with learning and team contribution.',
  },
];
