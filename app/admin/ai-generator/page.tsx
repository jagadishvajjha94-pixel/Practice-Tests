'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { parseMcqsFromAiText } from '@/lib/ai/parse-mcq-response';
import type { TestCategory } from '@/lib/types';

export default function AdminAiGeneratorPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<TestCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [topic, setTopic] = useState('Arrays and strings');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [raw, setRaw] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      const { data: admin } = await supabase.from('admin_users').select('id').eq('user_id', user.id).maybeSingle();
      if (!admin) {
        router.push('/dashboard');
        return;
      }
      const { data: cats } = await supabase.from('test_categories').select('*');
      setCategories(cats ?? []);
      if (cats?.[0]) setCategoryId(cats[0].id);
      setLoading(false);
    };
    void load();
  }, [router]);

  const generate = async () => {
    if (!categoryId) return;
    setGenerating(true);
    setMessage(null);
    setRaw('');
    try {
      const prompt = `Generate exactly ${count} multiple-choice questions for campus placement.
Topic: ${topic}
Difficulty: ${difficulty}
Return ONLY a JSON array. Each item:
{ "question_text": "...", "options": ["A text","B text","C text","D text"], "correct_answer": "A", "explanation": "...", "difficulty": "${difficulty}", "tags": ["topic"] }`;

      const res = await fetch('/api/v2/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'mcq_generate', prompt }),
      });
      const data = (await res.json()) as { result?: { text?: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setRaw(data.result?.text ?? '');
      setMessage('Generated. Review below, then import to question bank.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const importToBank = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !categoryId || !raw.trim()) return;
    const parsed = parseMcqsFromAiText(raw, categoryId);
    if (!parsed.length) {
      setMessage('Could not parse MCQs. Ensure JSON array format or Q1/A/B/C/D/Answer format.');
      return;
    }
    const rows = parsed.map((q) => ({
      category_id: q.category_id,
      difficulty: q.difficulty,
      question_text: q.question_text,
      type: q.type,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      tags: q.tags,
    }));
    const { error } = await supabase.from('questions').insert(rows);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(`Imported ${rows.length} questions into the bank.`);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI MCQ Generator</h1>
          <p className="text-sm text-muted-foreground">Uses /api/v2/ai/generate (OpenAI, Gemini, or Claude).</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/questions">← Questions</Link>
        </Button>
      </div>

      <Card className="p-6 lux-surface space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Category</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Count</label>
            <Input type="number" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Topic</label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Difficulty</label>
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <Button onClick={() => void generate()} disabled={generating}>
          {generating ? 'Generating…' : 'Generate MCQs'}
        </Button>
        {message ? <p className="text-sm text-primary">{message}</p> : null}
      </Card>

      {raw ? (
        <Card className="p-6 lux-surface space-y-4">
          <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={16} className="font-mono text-xs" />
          <Button onClick={() => void importToBank()}>Import to question bank</Button>
        </Card>
      ) : null}
    </div>
  );
}
