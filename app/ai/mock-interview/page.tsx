'use client';

import { useEffect, useRef, useState } from 'react';
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

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

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
  const [voiceMode, setVoiceMode] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechAvailable, setSpeechAvailable] = useState(false);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const answerBufferRef = useRef('');

  const getRecognitionCtor = (): BrowserSpeechRecognitionCtor | null => {
    if (typeof window === 'undefined') return null;
    const w = window as Window & {
      SpeechRecognition?: BrowserSpeechRecognitionCtor;
      webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeechError('Could not play AI voice. You can continue with text.');
    };
    window.speechSynthesis.speak(utterance);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const startListening = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSpeechError('Voice input is not supported in this browser.');
      return;
    }

    stopSpeaking();
    setSpeechError(null);
    answerBufferRef.current = '';
    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      setSpeechError(`Microphone issue: ${event.error}`);
      setIsListening(false);
    };
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        const part = event.results[i]?.[0]?.transcript ?? '';
        transcript += `${part} `;
      }
      const t = transcript.trim();
      answerBufferRef.current = t;
      setUserInput(t);
    };
    recognition.start();
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window as Window & {
        SpeechRecognition?: BrowserSpeechRecognitionCtor;
        webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
      };
      const available =
        'speechSynthesis' in window ||
        typeof w.SpeechRecognition !== 'undefined' ||
        typeof w.webkitSpeechRecognition !== 'undefined';
      setSpeechAvailable(available);
      if (!available) {
        setVoiceMode(false);
      }
    }

    return () => {
      stopListening();
      stopSpeaking();
    };
  }, []);

  const startInterview = () => {
    setSpeechError(null);
    setStarted(true);
    setCurrentQuestionIndex(0);
    setInterviewDone(false);
    setScore(0);
    const firstQuestion = INTERVIEW_QUESTIONS[0];
    const initialMessages: Message[] = [
      {
        id: '1',
        type: 'ai',
        content: firstQuestion.question,
      },
    ];
    setMessages(initialMessages);
    if (voiceMode && speechAvailable) speakText(firstQuestion.question);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || sending) return;
    stopListening();

    setSending(true);

    // Add user message
    const answerText = userInput.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: answerText,
    };

    setMessages(prev => [...prev, userMessage]);
    setUserInput('');

    // Simulate AI feedback
    setTimeout(() => {
      const currentQuestion = INTERVIEW_QUESTIONS[currentQuestionIndex];
      let feedbackScore = 60;

      // Simple scoring based on keyword matching
      const lowerInput = answerText.toLowerCase();
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

      setMessages(prev => {
        const next = [...prev, aiMessage];
        return next;
      });
      if (voiceMode && speechAvailable) {
        speakText(`Feedback. ${currentQuestion.feedback}. Score for this answer ${feedbackScore} out of 100.`);
      }

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
          if (voiceMode && speechAvailable) speakText(`Next question. ${nextQuestion.question}`);
        }, 1000);
      } else {
        setTimeout(() => {
          setInterviewDone(true);
          if (voiceMode && speechAvailable) speakText('Interview complete. Great work.');
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

            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold mb-1">Voice interview mode</p>
              <p>
                AI can ask questions verbally and you can answer by speaking using your microphone.
                Grant mic permission when prompted.
              </p>
              <div className="mt-3">
                <Button
                  type="button"
                  variant={voiceMode ? 'default' : 'outline'}
                  onClick={() => setVoiceMode((v) => !v)}
                  disabled={!speechAvailable}
                >
                  {voiceMode ? 'Voice Mode: ON' : 'Voice Mode: OFF'}
                </Button>
              </div>
            </div>

            <Button
              onClick={startInterview}
              className="w-full py-3 font-semibold mb-4"
            >
              Start Mock Interview
            </Button>

            {!speechAvailable ? (
              <p className="mb-3 text-xs text-amber-700">
                Voice APIs are not available in this browser. Interview still works with typing.
              </p>
            ) : null}

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
        {speechError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {speechError}
          </div>
        ) : null}
        <Card className="p-6 h-96 flex flex-col mb-6">
          <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Current question: {INTERVIEW_QUESTIONS[currentQuestionIndex]?.question}
          </div>
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

        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={startListening}
            disabled={sending || isListening}
          >
            {isListening ? 'Listening...' : '🎤 Start Speaking'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={stopListening}
            disabled={!isListening}
          >
            ⏹ Stop Speaking
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const q = INTERVIEW_QUESTIONS[currentQuestionIndex];
              if (q) speakText(q.question);
            }}
            disabled={isSpeaking}
          >
            🔊 Repeat AI Question
          </Button>
        </div>

        <div className="flex gap-2">
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type or speak your answer..."
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!userInput.trim() || sending}
          >
            {sending ? 'Processing...' : 'Submit Answer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
