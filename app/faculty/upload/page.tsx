'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusAlert } from '@/components/ui/status-alert';
import { ACADEMIC_YEARS, DEPARTMENTS } from '@/lib/college-brand';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { FacultyExamQuestion } from '@/lib/faculty-exams';

const emptyQuestion = (): FacultyExamQuestion => ({
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
});

export default function FacultyUploadPage() {
  const router = useRouter();
  const [department, setDepartment] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [years, setYears] = useState<string[]>([]);
  const [questions, setQuestions] = useState<FacultyExamQuestion[]>([emptyQuestion()]);
  const [submitting, setSubmitting] = useState(false);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pdfNote, setPdfNote] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/faculty/profile');
      if (!res.ok) return;
      const json = (await res.json()) as { department?: string };
      if (json.department) setDepartment(json.department);
    };
    void load();
  }, []);

  const toggleYear = (year: string) => {
    setYears((prev) => (prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]));
  };

  const updateQuestion = (index: number, patch: Partial<FacultyExamQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const handlePdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsingPdf(true);
    setError(null);
    setPdfNote(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/faculty/exams/parse-pdf', {
        method: 'POST',
        headers,
        body: form,
      });
      const json = (await res.json()) as {
        questions?: FacultyExamQuestion[];
        count?: number;
        warnings?: string[];
        error?: string;
      };

      if (!res.ok) throw new Error(json.error ?? 'Could not read PDF');

      const imported = json.questions ?? [];
      if (imported.length === 0) {
        throw new Error(
          json.warnings?.[0] ??
            'No questions found. Format: numbered questions, options A–D, and Answer: X.',
        );
      }

      setQuestions(imported);
      setPdfNote(
        `Imported ${imported.length} question${imported.length === 1 ? '' : 's'} from PDF. Review and edit below before submitting.`,
      );
      if (json.warnings?.length) {
        setPdfNote(`${json.warnings.join(' ')} ${imported.length} questions loaded.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF import failed');
    } finally {
      setParsingPdf(false);
      e.target.value = '';
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!department) {
      setError('Select your department before submitting.');
      return;
    }
    if (!title.trim()) {
      setError('Exam title is required.');
      return;
    }
    if (years.length === 0) {
      setError('Select at least one target year.');
      return;
    }

    setSubmitting(true);
    try {
      await fetch('/api/faculty/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department }),
      });

      const res = await fetch('/api/faculty/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          target_years: years,
          duration_minutes: duration,
          questions,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Submit failed');

      setMessage('Exam submitted for approval. Students will see it once the examination cell approves it.');
      setTimeout(() => router.push('/faculty/dashboard'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Department exam submission</h2>
        <p className="text-slate-600 mt-1 text-sm leading-relaxed">
          Upload a question paper PDF or enter MCQs manually. Submissions require examination-cell approval
          before students can attempt the test.
        </p>
      </div>

      {error ? <StatusAlert variant="error">{error}</StatusAlert> : null}
      {message ? <StatusAlert variant="success">{message}</StatusAlert> : null}
      {pdfNote ? <StatusAlert variant="info">{pdfNote}</StatusAlert> : null}

      <Card className="p-6 space-y-4 border-dashed border-slate-300 bg-slate-50/50">
        <div>
          <h3 className="font-semibold text-slate-900">Import from PDF</h3>
          <p className="text-sm text-slate-600 mt-1">
            Upload your department question paper (.pdf). Questions should be numbered with options A–D and an
            answer key (e.g. <span className="font-mono text-xs">Answer: B</span>).
          </p>
        </div>
        <Input
          type="file"
          accept=".pdf,application/pdf"
          disabled={parsingPdf}
          onChange={(e) => void handlePdfImport(e)}
          className="bg-white"
        />
        {parsingPdf ? (
          <p className="text-sm text-slate-500">Reading question paper…</p>
        ) : null}
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
          <select
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
          >
            <option value="">Select department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Exam title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
          <Input
            type="number"
            min={5}
            max={180}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Target years</p>
          <div className="flex flex-wrap gap-2">
            {ACADEMIC_YEARS.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => toggleYear(y)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  years.includes(y)
                    ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">MCQ questions</h3>
            <p className="text-xs text-slate-500 mt-0.5">{questions.length} question(s) in this paper</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setQuestions((q) => [...q, emptyQuestion()])}
          >
            Add question
          </Button>
        </div>

        {questions.map((q, idx) => (
          <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-2 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Question {idx + 1}
            </p>
            <Input
              placeholder="Question text"
              value={q.question_text}
              onChange={(e) => updateQuestion(idx, { question_text: e.target.value })}
            />
            {(['A', 'B', 'C', 'D'] as const).map((letter) => (
              <Input
                key={letter}
                placeholder={`Option ${letter}`}
                value={q[`option_${letter.toLowerCase()}` as 'option_a']}
                onChange={(e) =>
                  updateQuestion(idx, {
                    [`option_${letter.toLowerCase()}`]: e.target.value,
                  } as Partial<FacultyExamQuestion>)
                }
              />
            ))}
            <select
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
              value={q.correct_answer}
              onChange={(e) =>
                updateQuestion(idx, {
                  correct_answer: e.target.value as FacultyExamQuestion['correct_answer'],
                })
              }
            >
              <option value="A">Correct answer: A</option>
              <option value="B">Correct answer: B</option>
              <option value="C">Correct answer: C</option>
              <option value="D">Correct answer: D</option>
            </select>
          </div>
        ))}
      </Card>

      <Button type="submit" disabled={submitting} className="bg-[#1e3a5f] hover:bg-[#16304f] text-white">
        {submitting ? 'Submitting…' : 'Submit for approval'}
      </Button>
    </form>
  );
}
