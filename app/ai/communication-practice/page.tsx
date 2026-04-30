'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Analysis = {
  fluency: number;
  grammar: number;
  confidence: number;
  tips: string[];
};

const PROMPTS = [
  'Describe a memorable learning experience that changed your perspective.',
  'Do you agree that technology improves communication? Give examples.',
  'Should university education be skill-focused or theory-focused?',
  'Talk about a challenge you solved using teamwork.',
  'What are the benefits and drawbacks of social media for students?',
];

function analyzeResponse(text: string): Analysis {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const unique = new Set(words.map((w) => w.toLowerCase())).size;
  const sentences = Math.max(
    1,
    text.split(/[.!?]/).filter((s) => s.trim()).length
  );
  const avgSentenceLength = words.length / sentences;

  const tips: string[] = [];
  let fluency = 5;
  let grammar = 5;
  let confidence = 5;

  if (words.length > 60) fluency += 2;
  if (words.length > 100) fluency += 1;
  if (avgSentenceLength > 8 && avgSentenceLength < 22) grammar += 2;
  if (/[.!?]$/.test(text.trim())) grammar += 1;
  if (unique / Math.max(words.length, 1) > 0.55) confidence += 1;
  if (/\b(I believe|in my opinion|I suggest|I think)\b/i.test(text))
    confidence += 2;

  if (words.length < 40) tips.push('Speak a bit longer with more supporting points.');
  if (!/[.!?]$/.test(text.trim()))
    tips.push('Use complete sentences with clear punctuation.');
  if (unique / Math.max(words.length, 1) < 0.45)
    tips.push('Use more varied vocabulary instead of repeating the same words.');
  if (!/\bfor example|for instance|because\b/i.test(text))
    tips.push('Add examples and reasoning to improve IELTS/TOEFL style clarity.');

  return {
    fluency: Math.min(10, fluency),
    grammar: Math.min(10, grammar),
    confidence: Math.min(10, confidence),
    tips: tips.length ? tips : ['Great response. Keep practicing with timed speaking prompts.'],
  };
}

export default function CommunicationPracticePage() {
  const [promptIndex, setPromptIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [listening, setListening] = useState(false);

  const prompt = useMemo(() => PROMPTS[promptIndex], [promptIndex]);

  const startVoiceInput = () => {
    const SpeechRecognition =
      (window as Window & { webkitSpeechRecognition?: typeof window.SpeechRecognition })
        .SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: typeof window.SpeechRecognition })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not available in this browser. You can still type your answer.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + ' ';
      }
      setAnswer(transcript.trim());
    };

    recognition.start();
    setTimeout(() => recognition.stop(), 60000); // 1 minute practice window
  };

  const evaluate = () => {
    if (!answer.trim()) return;
    setAnalysis(analyzeResponse(answer));
  };

  const nextPrompt = () => {
    setPromptIndex((p) => (p + 1) % PROMPTS.length);
    setAnswer('');
    setAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">English Vocal Communication Practice</h1>
          <Link href="/tests/swarx">
            <Button variant="outline">Back to SWARX</Button>
          </Link>
        </div>

        <Card className="p-6">
          <p className="text-sm text-gray-500 mb-2">Prompt (IELTS/TOEFL/GRE speaking style)</p>
          <p className="text-lg font-semibold text-gray-900 mb-4">{prompt}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              type="button"
              onClick={startVoiceInput}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {listening ? 'Listening...' : 'Record Voice Answer'}
            </Button>
            <Button type="button" variant="outline" onClick={nextPrompt}>
              New Prompt
            </Button>
          </div>
          <Textarea
            placeholder="Your spoken transcript will appear here (or type manually)."
            className="min-h-40"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <Button
            type="button"
            onClick={evaluate}
            disabled={!answer.trim()}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Evaluate Communication
          </Button>
        </Card>

        {analysis && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Feedback Report (English Focus)</h2>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 rounded-lg bg-blue-50">
                <p className="text-sm text-gray-600">Fluency</p>
                <p className="text-2xl font-bold text-blue-700">{analysis.fluency}/10</p>
              </div>
              <div className="p-4 rounded-lg bg-violet-50">
                <p className="text-sm text-gray-600">Grammar</p>
                <p className="text-2xl font-bold text-violet-700">{analysis.grammar}/10</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50">
                <p className="text-sm text-gray-600">Confidence</p>
                <p className="text-2xl font-bold text-amber-700">{analysis.confidence}/10</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              {analysis.tips.map((tip, i) => (
                <li key={i}>- {tip}</li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
