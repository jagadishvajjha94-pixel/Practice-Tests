'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message {
  id: string;
  type: 'ai' | 'user';
  content: string;
}

interface InterviewQuestion {
  question: string;
  expectedKeywords: string[];
  feedback: string;
}

const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    question: 'Tell me about yourself and your background.',
    expectedKeywords: ['experience', 'education', 'skills'],
    feedback: 'Good! You covered your background. Try to be more specific about achievements.',
  },
  {
    question: 'What are your key strengths and how do they benefit this role?',
    expectedKeywords: ['strengths', 'skills', 'relevant', 'experience'],
    feedback: 'Great answer! You aligned your strengths with the role requirements.',
  },
  {
    question: 'Describe a challenging project you worked on and how you solved it.',
    expectedKeywords: ['problem', 'solution', 'results', 'learning'],
    feedback: 'Excellent! You provided a concrete example with measurable results.',
  },
  {
    question: 'What do you know about our company?',
    expectedKeywords: ['company', 'mission', 'products', 'culture', 'values'],
    feedback: 'Good effort! Research more about specific projects and initiatives.',
  },
  {
    question: 'Where do you see yourself in 5 years?',
    expectedKeywords: ['growth', 'development', 'goals', 'responsibility'],
    feedback: 'Nice! Show ambition while staying aligned with company growth.',
  },
];

export default function MockInterviewPage() {
  const [started, setStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [interviewDone, setInterviewDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [score, setScore] = useState(0);

  const startInterview = () => {
    setStarted(true);
    const firstQuestion = INTERVIEW_QUESTIONS[0];
    setMessages([
      {
        id: '1',
        type: 'ai',
        content: firstQuestion.question,
      },
    ]);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    setSending(true);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: userInput,
    };

    setMessages(prev => [...prev, userMessage]);
    setUserInput('');

    // Simulate AI feedback
    setTimeout(() => {
      const currentQuestion = INTERVIEW_QUESTIONS[currentQuestionIndex];
      let feedbackScore = 60;

      // Simple scoring based on keyword matching
      const lowerInput = userInput.toLowerCase();
      currentQuestion.expectedKeywords.forEach(keyword => {
        if (lowerInput.includes(keyword.toLowerCase())) {
          feedbackScore += 10;
        }
      });

      feedbackScore = Math.min(feedbackScore, 100);
      setScore(prev => (prev + feedbackScore) / 2);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `Feedback: ${currentQuestion.feedback}\n\nScore for this answer: ${feedbackScore}/100`,
      };

      setMessages(prev => [...prev, aiMessage]);

      // Next question
      if (currentQuestionIndex < INTERVIEW_QUESTIONS.length - 1) {
        setTimeout(() => {
          const nextQuestion = INTERVIEW_QUESTIONS[currentQuestionIndex + 1];
          const nextMessage: Message = {
            id: (Date.now() + 2).toString(),
            type: 'ai',
            content: `\n\nNext question: ${nextQuestion.question}`,
          };
          setMessages(prev => [...prev, nextMessage]);
          setCurrentQuestionIndex(prev => prev + 1);
        }, 1000);
      } else {
        setTimeout(() => {
          setInterviewDone(true);
        }, 1000);
      }

      setSending(false);
    }, 1500);
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">AI Mock Interview</h1>
              <Link href="/dashboard">
                <Button variant="outline">Back</Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Practice Your Interview Skills</h2>
            <p className="text-gray-600 mb-6">
              Get feedback from our AI interviewer on your responses. This mock interview will help you prepare for real interviews with personalized feedback on your answers.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="p-6 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>✓ Answer 5 interview questions</li>
                  <li>✓ Get instant feedback on each answer</li>
                  <li>✓ Receive a detailed score</li>
                  <li>✓ Get improvement recommendations</li>
                </ul>
              </div>

              <div className="p-6 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">You'll be asked about:</h3>
                <ul className="space-y-2 text-sm text-green-800">
                  <li>✓ Your background and experience</li>
                  <li>✓ Your strengths</li>
                  <li>✓ Problem-solving abilities</li>
                  <li>✓ Company knowledge</li>
                  <li>✓ Your career goals</li>
                </ul>
              </div>
            </div>

            <Button
              onClick={startInterview}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 font-semibold mb-4"
            >
              Start Mock Interview
            </Button>

            <p className="text-sm text-gray-600">
              Takes about 10-15 minutes. You can retake the interview anytime to improve your score.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (interviewDone) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Card className="p-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Interview Complete!</h1>
            
            <div className="my-8 flex justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold text-blue-600 mb-2">{Math.round(score)}</div>
                <p className="text-gray-600">Overall Score</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
              <h3 className="font-semibold text-blue-900 mb-3">Summary</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>✓ Completed 5 interview questions</li>
                <li>✓ Received personalized feedback on each answer</li>
                <li>✓ Areas for improvement identified</li>
                <li>✓ Ready for real interviews</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => {
                  setStarted(false);
                  setCurrentQuestionIndex(0);
                  setMessages([]);
                  setInterviewDone(false);
                  setScore(0);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Retake Interview
              </Button>
              <Link href="/ai/resume-review" className="block">
                <Button variant="outline" className="w-full">
                  Try Resume Review
                </Button>
              </Link>
              <Link href="/dashboard" className="block">
                <Button variant="outline" className="w-full">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Mock Interview</h1>
          <div className="text-center">
            <p className="text-sm text-gray-600">Question {currentQuestionIndex + 1} of {INTERVIEW_QUESTIONS.length}</p>
            <div className="w-40 bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${((currentQuestionIndex + 1) / INTERVIEW_QUESTIONS.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="p-6 h-96 flex flex-col mb-6">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.type === 'ai' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    message.type === 'ai'
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex gap-2">
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your answer..."
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!userInput.trim() || sending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {sending ? 'Processing...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
