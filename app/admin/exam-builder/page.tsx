'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusAlert } from '@/components/ui/status-alert';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { ExamBuilderControls } from '@/components/exam-builder/exam-builder-controls';
import { ACADEMIC_YEARS, DEPARTMENTS } from '@/lib/college-brand';
import { getExamBuilderTestType } from '@/lib/exam-builder/test-catalog';
import type { FacultyExamQuestion } from '@/lib/faculty-exams';
import { cn } from '@/lib/utils';

export default function AdminExamBuilderPage() {
  const [testType, setTestType] = useState('aptitude');
  const [slotKey, setSlotKey] = useState('slot-1');
  const [syllabusTopicIds, setSyllabusTopicIds] = useState<string[]>([]);
  const [questionsPerTopic, setQuestionsPerTopic] = useState(5);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('All departments');
  const [targetYears, setTargetYears] = useState<string[]>([...ACADEMIC_YEARS]);
  const [duration, setDuration] = useState(45);

  const [questions, setQuestions] = useState<FacultyExamQuestion[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [takeUrl, setTakeUrl] = useState<string | null>(null);

  const testDef = getExamBuilderTestType(testType);
  const isManual = testType === 'department-manual';
  const needsSyllabus = Boolean(testDef?.requiresSyllabus);

  const toggleYear = (year: string) =>
    setTargetYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year],
    );

  const publish = async () => {
    setError(null);
    setSuccess(null);
    setTakeUrl(null);

    if (needsSyllabus && !syllabusTopicIds.length) {
      setError('Select syllabus topics before publishing.');
      return;
    }
    if (!questions.length && !needsSyllabus) {
      setError('Manual exams need questions — use faculty upload for typed MCQs.');
      return;
    }

    setPublishing(true);
    try {
      const res = await fetch('/api/admin/exam-builder/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testType,
          slotKey,
          topicIds: syllabusTopicIds,
          questionsPerTopic,
          title: title.trim() || `${testDef?.name ?? 'Exam'} Examination`,
          description: description.trim() || undefined,
          department,
          targetYears,
          durationMinutes: duration,
          questions: questions.length ? questions : undefined,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        message?: string;
        takeUrl?: string;
      };
      if (!res.ok) throw new Error(json.error ?? 'Publish failed');

      setSuccess(json.message ?? 'Exam published.');
      setTakeUrl(json.takeUrl ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <AdminPageHeader
        title="Exam builder"
        description="Select the test type from the dropdown, pick syllabus topics (Aptitude opens a popup), choose a slot for non-repetitive question sets, and publish directly."
      />

      {error ? <StatusAlert variant="error">{error}</StatusAlert> : null}
      {success ? <StatusAlert variant="success">{success}</StatusAlert> : null}
      {warnings.length ? <StatusAlert variant="info">{warnings.join(' ')}</StatusAlert> : null}

      <Card className="p-6 space-y-6">
        <ExamBuilderControls
          testType={testType}
          onTestTypeChange={(id) => {
            setTestType(id);
            const def = getExamBuilderTestType(id);
            if (def && !title.trim()) setTitle(`${def.name} Examination`);
            if (def) {
              setDuration(def.defaultDurationMinutes);
              setQuestionsPerTopic(def.defaultQuestionsPerTopic);
            }
            setQuestions([]);
            setWarnings([]);
          }}
          slotKey={slotKey}
          onSlotKeyChange={setSlotKey}
          selectedTopicIds={syllabusTopicIds}
          onSelectedTopicIdsChange={setSyllabusTopicIds}
          questionsPerTopic={questionsPerTopic}
          onQuestionsPerTopicChange={setQuestionsPerTopic}
          onQuestionsGenerated={(qs, w) => {
            setQuestions(qs);
            setWarnings(w);
          }}
        />

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Exam title
            </label>
            <Input
              className="mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Aptitude · Slot 1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Duration (minutes)
            </label>
            <Input
              type="number"
              min={5}
              max={180}
              className="mt-1"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 45)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Description
            </label>
            <Input
              className="mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — shown on the test card"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Department scope
            </label>
            <select
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="All departments">All departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Target years
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ACADEMIC_YEARS.map((y) => {
                const active = targetYears.includes(y);
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => toggleYear(y)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition',
                      active
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400',
                    )}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {questions.length > 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-sm font-semibold text-emerald-900">
              Question paper ready — {questions.length} MCQs
            </p>
            <p className="text-xs text-emerald-800 mt-1">
              Topics are de-duplicated per slot so repeat sittings get fresh sets.
            </p>
          </div>
        ) : needsSyllabus ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Generate the question paper above before publishing.
          </p>
        ) : null}

        {isManual ? (
          <StatusAlert variant="info">
            For manual department MCQs, faculty use{' '}
            <Link href="/faculty/upload" className="font-semibold underline">
              Create exam
            </Link>{' '}
            — admin can approve and schedule from Faculty approvals.
          </StatusAlert>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            disabled={publishing || isManual || (needsSyllabus && !questions.length)}
            onClick={() => void publish()}
            className="bg-[#1e3a5f] hover:bg-[#16304f]"
          >
            {publishing ? 'Publishing…' : 'Publish exam'}
          </Button>
          {takeUrl ? (
            <Link href={takeUrl}>
              <Button variant="outline">Preview test →</Button>
            </Link>
          ) : null}
          <Link href="/admin/exam-schedules">
            <Button variant="ghost">Schedule live →</Button>
          </Link>
        </div>
      </Card>

      {questions.length > 0 ? (
        <Card className="p-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-[#0c2340]">Generated questions</h3>
            <Badge tone="brand">{questions.length} MCQs</Badge>
          </div>
          <ul className="space-y-2 max-h-64 overflow-y-auto text-sm text-slate-700">
            {questions.slice(0, 8).map((q, i) => (
              <li key={i} className="border-b border-slate-100 pb-2">
                <span className="font-medium text-slate-500">Q{i + 1}. </span>
                {q.question_text.slice(0, 120)}
                {q.question_text.length > 120 ? '…' : ''}
              </li>
            ))}
            {questions.length > 8 ? (
              <li className="text-xs text-slate-500">…and {questions.length - 8} more</li>
            ) : null}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
