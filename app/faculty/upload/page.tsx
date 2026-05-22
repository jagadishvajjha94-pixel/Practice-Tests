'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusAlert } from '@/components/ui/status-alert';
import { Badge } from '@/components/ui/badge';
import { ACADEMIC_YEARS, DEPARTMENTS } from '@/lib/college-brand';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { FacultyExamQuestion } from '@/lib/faculty-exams';
import { cn } from '@/lib/utils';
import { ExamBuilderControls } from '@/components/exam-builder/exam-builder-controls';
import { QuestionBankUploadPanel } from '@/components/exam-builder/question-bank-upload-panel';
import { McqUploadFormatGuide } from '@/components/exam-builder/mcq-upload-format-guide';
import { DepartmentGroupPicker } from '@/components/exam-builder/department-group-picker';
import {
  ExamSlotSchedulePanel,
  emptySlots,
} from '@/components/exam-builder/exam-slot-schedule-panel';
import { getExamBuilderTestType } from '@/lib/exam-builder/test-catalog';
import type { ExamScheduleSlotInput } from '@/lib/exam-schedule-slots';
import { validateScheduleSlots } from '@/lib/exam-schedule-slots';

type Step = 'details' | 'questions' | 'review';

const MANUAL_STEPS: Array<{ id: Step; label: string; hint: string }> = [
  { id: 'details', label: 'Exam details', hint: 'Topic · Branches · Years · Duration' },
  { id: 'questions', label: 'Questions', hint: 'Upload CSV/PDF/Word or enter manually' },
  { id: 'review', label: 'Review & submit', hint: 'Summary then send for approval' },
];

const SYLLABUS_STEPS: Array<{ id: Step; label: string; hint: string }> = [
  { id: 'details', label: 'Exam details', hint: 'Topics · branches · draw from bank' },
  { id: 'review', label: 'Review & submit', hint: 'Confirm and send for admin approval' },
];

const emptyQuestion = (): FacultyExamQuestion => ({
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
});

const questionIsValid = (q: FacultyExamQuestion) =>
  q.question_text.trim().length > 0 &&
  q.option_a.trim().length > 0 &&
  q.option_b.trim().length > 0 &&
  q.option_c.trim().length > 0 &&
  q.option_d.trim().length > 0;

export default function FacultyUploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');

  // Step 1 – details
  const [department, setDepartment] = useState('');
  const [extraBranches, setExtraBranches] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [years, setYears] = useState<string[]>([]);

  const [testType, setTestType] = useState('aptitude');
  const [slotKey, setSlotKey] = useState('slot-1');
  const [syllabusTopicIds, setSyllabusTopicIds] = useState<string[]>([]);
  const [questionsPerTopic, setQuestionsPerTopic] = useState(5);
  const [paperWarnings, setPaperWarnings] = useState<string[]>([]);
  const [departmentGroupId, setDepartmentGroupId] = useState('');
  const [catalogRefresh, setCatalogRefresh] = useState(0);
  const [usesSlotScheduling, setUsesSlotScheduling] = useState(false);
  const [scheduleSlots, setScheduleSlots] = useState<ExamScheduleSlotInput[]>(emptySlots);

  // Step 2 – questions
  const [questions, setQuestions] = useState<FacultyExamQuestion[]>([emptyQuestion()]);
  const [parsingPdf, setParsingPdf] = useState(false);

  // UX state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pdfNote, setPdfNote] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/faculty/profile');
      if (!res.ok) return;
      const json = (await res.json()) as { department?: string };
      if (json.department) {
        setDepartment(json.department);
        const groupsRes = await fetch('/api/department-groups');
        if (groupsRes.ok) {
          const groupsJson = (await groupsRes.json()) as {
            groups?: Array<{ id: string; name: string; departments: string[] }>;
          };
          const match = (groupsJson.groups ?? []).find(
            (g) => g.name === json.department || g.departments.length === 1 && g.departments[0] === json.department,
          );
          if (match) setDepartmentGroupId(match.id);
        }
      }
    };
    void load();
  }, []);

  const toggleYear = (year: string) =>
    setYears((prev) => (prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]));

  const toggleBranch = (branch: string) =>
    setExtraBranches((prev) =>
      prev.includes(branch) ? prev.filter((b) => b !== branch) : [...prev, branch],
    );

  const updateQuestion = (index: number, patch: Partial<FacultyExamQuestion>) =>
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  const removeQuestion = (index: number) =>
    setQuestions((prev) => prev.filter((_, i) => i !== index));

  const validQuestionCount = useMemo(
    () => questions.filter(questionIsValid).length,
    [questions],
  );

  const testDef = getExamBuilderTestType(testType);
  const isManualExam = testType === 'department-manual';
  const steps = isManualExam ? MANUAL_STEPS : SYLLABUS_STEPS;

  const needsSyllabus = Boolean(testDef?.requiresSyllabus);
  const detailsValid =
    department.length > 0 &&
    title.trim().length > 0 &&
    years.length > 0 &&
    duration >= 5 &&
    duration <= 180 &&
    (!needsSyllabus || syllabusTopicIds.length > 0);

  const canProceedFromQuestions = validQuestionCount > 0;

  const handleDocumentImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/faculty/exams/parse-document', {
        method: 'POST',
        headers,
        body: form,
      });
      const json = (await res.json()) as {
        questions?: FacultyExamQuestion[];
        warnings?: string[];
        error?: string;
        formatHint?: string;
        textPreview?: string;
        charsExtracted?: number;
      };
      if (!res.ok) {
        const parts = [
          json.error,
          json.warnings?.join(' '),
          json.charsExtracted != null
            ? `Extracted ${json.charsExtracted} characters from file.`
            : null,
          json.textPreview
            ? `Preview: "${json.textPreview.slice(0, 120)}…"`
            : null,
        ].filter(Boolean);
        throw new Error(parts.join(' ') || 'Could not read file');
      }

      const imported = json.questions ?? [];
      if (imported.length === 0) {
        throw new Error(json.warnings?.[0] ?? 'No questions found in file.');
      }
      setQuestions(imported);
      setPdfNote(
        `Imported ${imported.length} question${imported.length === 1 ? '' : 's'}. Review and edit below before submitting. ${(json.warnings ?? []).join(' ')}`.trim(),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File import failed');
    } finally {
      setParsingPdf(false);
      e.target.value = '';
    }
  };

  const submitExam = async (overrideQuestions?: FacultyExamQuestion[]) => {
    setError(null);
    setMessage(null);
    if (!detailsValid) {
      setError('Please complete exam details (title, branch, and at least one year).');
      setStep('details');
      return;
    }
    const cleanQuestions = (overrideQuestions ?? questions).filter(questionIsValid);
    if (cleanQuestions.length === 0) {
      setError(
        isManualExam
          ? 'Add at least one complete MCQ (question + 4 options).'
          : 'Draw or generate a question paper from the bank first.',
      );
      if (isManualExam) setStep('questions');
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
          topic: topic.trim() || testDef?.name || undefined,
          description: description.trim() || undefined,
          target_years: years,
          target_branches: extraBranches,
          duration_minutes: duration,
          questions: cleanQuestions,
          test_type: testType,
          slot_key: slotKey,
          syllabus_topic_ids: syllabusTopicIds,
          questions_per_topic: questionsPerTopic,
          department_group_id: departmentGroupId || undefined,
          uses_slot_scheduling: usesSlotScheduling,
          schedule_slots: usesSlotScheduling ? scheduleSlots : [],
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Submit failed');

      setMessage(
        'Submitted for approval. Students see it once the examination cell approves it.',
      );
      setTimeout(() => router.push('/faculty/dashboard'), 1300);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const slotsValid = !usesSlotScheduling || validateScheduleSlots(scheduleSlots) === null;
  const canSubmit = canProceedFromQuestions && detailsValid && slotsValid;

  const handleBankQuestionsReady = (qs: FacultyExamQuestion[], warnings: string[]) => {
    setPaperWarnings(warnings);
    if (!qs.length) {
      setQuestions([emptyQuestion()]);
      return;
    }
    setQuestions(qs);

    if (isManualExam) {
      setStep('questions');
      return;
    }

    setError(null);
    setMessage(
      `${qs.length} question(s) loaded from the bank. Complete any missing details above, then click Submit for approval.`,
    );
  };

  const stepperCanEnter: Record<Step, boolean> = isManualExam
    ? { details: true, questions: detailsValid, review: detailsValid && canProceedFromQuestions }
    : { details: true, questions: false, review: canProceedFromQuestions };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="app-title-lg">Create an exam</h2>
        <p className="app-subtitle">
          Fill in exam details, draw questions from the bank, then review and submit for admin approval.
          Students see the test only after the examination cell approves it.
        </p>
      </div>

      <Stepper steps={steps} current={step} onSelect={setStep} canEnter={stepperCanEnter} />

      {error ? <StatusAlert variant="error">{error}</StatusAlert> : null}
      {message ? <StatusAlert variant="success">{message}</StatusAlert> : null}
      {pdfNote ? <StatusAlert variant="info">{pdfNote}</StatusAlert> : null}

      {step === 'details' ? (
        <Card className="p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="app-section-title">Exam details</h3>
            <p className="app-muted mt-0.5">Test type, branches, years, title, and duration.</p>
          </div>

          <ExamBuilderControls
            testType={testType}
            onTestTypeChange={(id) => {
              setTestType(id);
              const def = getExamBuilderTestType(id);
              if (def && !title.trim()) setTitle(`${def.name} Examination`);
              if (def) setDuration(def.defaultDurationMinutes);
            }}
            slotKey={slotKey}
            onSlotKeyChange={setSlotKey}
            selectedTopicIds={syllabusTopicIds}
            onSelectedTopicIdsChange={setSyllabusTopicIds}
            questionsPerTopic={questionsPerTopic}
            onQuestionsPerTopicChange={setQuestionsPerTopic}
            onQuestionsGenerated={handleBankQuestionsReady}
            catalogRefreshToken={catalogRefresh}
          />

          <QuestionBankUploadPanel
            tagIds={syllabusTopicIds}
            onBankUpdated={() => setCatalogRefresh((n) => n + 1)}
          />

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Exam title" hint="Shown to students on the test hub.">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Operating Systems · Mid-1"
                required
              />
            </Field>
            <Field label="Topic / unit" hint="Optional. Helps students prepare.">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Process scheduling"
              />
            </Field>
          </div>

          <Field label="Short description" hint="One or two lines visible to admin & students.">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Covers Chapters 3–4 from the syllabus."
            />
          </Field>

          <Field
            label="Primary branch (your department)"
            hint="Auto-filled from your faculty profile."
          >
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
            >
              <option value="">Select your department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>

          <DepartmentGroupPicker
            value={departmentGroupId}
            onChange={setDepartmentGroupId}
            primaryDepartment={department}
          />

          <ExamSlotSchedulePanel
            enabled={usesSlotScheduling}
            onEnabledChange={(v) => {
              setUsesSlotScheduling(v);
              if (v && scheduleSlots.length === 0) setScheduleSlots(emptySlots());
            }}
            slots={scheduleSlots}
            onSlotsChange={setScheduleSlots}
          />

          <Field
            label="Make available to additional branches"
            hint="Optional when a department group is selected — adds extra branches beyond the group."
          >
            <div className="flex flex-wrap gap-2">
              {DEPARTMENTS.filter((d) => d !== department).map((d) => {
                const active = extraBranches.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleBranch(d)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition',
                      active
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400',
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Target years" hint="Students must be in one of these years.">
              <div className="flex flex-wrap gap-2">
                {ACADEMIC_YEARS.map((y) => {
                  const active = years.includes(y);
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
            </Field>

            <Field label="Duration (minutes)" hint="Between 5 and 180.">
              <Input
                type="number"
                min={5}
                max={180}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </Field>
          </div>

          {!isManualExam && paperWarnings.length > 0 ? (
            <StatusAlert variant="info">{paperWarnings.join(' ')}</StatusAlert>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            {isManualExam ? (
              <Button
                onClick={() => setStep('questions')}
                disabled={!detailsValid}
                className="bg-[#1e3a5f] hover:bg-[#16304f]"
              >
                Continue to questions →
              </Button>
            ) : (
              <>
                {canProceedFromQuestions ? (
                  <>
                    <Button variant="outline" onClick={() => setStep('review')}>
                      Review summary
                    </Button>
                    <Button
                      disabled={submitting || !canSubmit}
                      onClick={() => void submitExam()}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white min-w-[11rem]"
                    >
                      {submitting ? 'Submitting…' : 'Submit for approval'}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-slate-600">
                    Use <strong>Draw from bank</strong> or <strong>Generate with AI</strong> above, then
                    submit for admin approval.
                  </p>
                )}
              </>
            )}
          </div>
        </Card>
      ) : null}

      {step === 'questions' && isManualExam ? (
        <>
          <Card className="p-6 sm:p-8 space-y-4 border-dashed border-slate-300 bg-slate-50/50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="app-section-title">Import from file</h3>
                <p className="app-muted mt-0.5">
                  Upload <strong>.csv</strong> (recommended), <strong>.docx</strong>, or text-based{' '}
                  <strong>.pdf</strong>. Scanned/image-only PDFs will not work.
                </p>
              </div>
              <Badge tone="brand">CSV · PDF · Word</Badge>
            </div>
            <McqUploadFormatGuide />
            <Input
              type="file"
              accept=".csv,.pdf,.docx,.txt,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              disabled={parsingPdf}
              onChange={(e) => void handleDocumentImport(e)}
              className="bg-white"
            />
            {parsingPdf ? <p className="text-sm text-slate-500">Reading question paper…</p> : null}
          </Card>

          <Card className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="app-section-title">MCQ questions</h3>
                <p className="app-muted mt-0.5">
                  {validQuestionCount} of {questions.length} marked complete
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuestions((q) => [...q, emptyQuestion()])}
              >
                + Add question
              </Button>
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3 bg-white"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Question {idx + 1}
                    </p>
                    <div className="flex items-center gap-2">
                      {questionIsValid(q) ? (
                        <Badge tone="success">Complete</Badge>
                      ) : (
                        <Badge tone="warning">Incomplete</Badge>
                      )}
                      {questions.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeQuestion(idx)}
                          className="text-xs font-medium text-slate-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <Input
                    placeholder="Question text"
                    value={q.question_text}
                    onChange={(e) => updateQuestion(idx, { question_text: e.target.value })}
                  />
                  <div className="grid sm:grid-cols-2 gap-2">
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
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Correct answer:</span>
                    {(['A', 'B', 'C', 'D'] as const).map((letter) => (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => updateQuestion(idx, { correct_answer: letter })}
                        className={cn(
                          'h-7 w-7 rounded-full text-xs font-bold border transition',
                          q.correct_answer === letter
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400',
                        )}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep('details')}>
              ← Back
            </Button>
            <Button
              onClick={() => setStep('review')}
              disabled={!canProceedFromQuestions}
              className="bg-[#1e3a5f] hover:bg-[#16304f]"
            >
              Review submission →
            </Button>
          </div>
        </>
      ) : null}

      {step === 'review' ? (
        <Card className="p-6 sm:p-8 space-y-5">
          <div>
            <h3 className="app-section-title">Review submission</h3>
            <p className="app-muted mt-0.5">
              Confirm the details below. Once submitted, the test is locked from students until
              admin approves it.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
            <DetailRow label="Test type">{testDef?.name ?? testType}</DetailRow>
            <DetailRow label="Question bank slot">{slotKey.replace(/-/g, ' ')}</DetailRow>
            {usesSlotScheduling ? (
              <DetailRow label="Exam slots">
                {scheduleSlots.filter((s) => s.roster.length > 0).length} of 8 configured (
                {scheduleSlots.reduce((n, s) => n + s.roster.length, 0)} students total)
              </DetailRow>
            ) : null}
            <DetailRow label="Title">{title || '—'}</DetailRow>
            <DetailRow label="Topic">{topic || testDef?.name || '—'}</DetailRow>
            {needsSyllabus ? (
              <DetailRow label="Syllabus topics">
                {syllabusTopicIds.length
                  ? `${syllabusTopicIds.length} selected · ${questionsPerTopic} per topic`
                  : '—'}
              </DetailRow>
            ) : null}
            {departmentGroupId ? (
              <DetailRow label="Department group">Selected</DetailRow>
            ) : null}
            <DetailRow label="Primary branch">{department || '—'}</DetailRow>
            <DetailRow label="Additional branches">
              {extraBranches.length ? extraBranches.join(', ') : '— (own branch only)'}
            </DetailRow>
            <DetailRow label="Target years">
              {years.length ? years.join(', ') : '—'}
            </DetailRow>
            <DetailRow label="Duration">{duration} minutes</DetailRow>
            <DetailRow label="Questions">{validQuestionCount} complete</DetailRow>
            <DetailRow label="Status on submit">
              <Badge tone="warning">Pending admin approval</Badge>
            </DetailRow>
          </div>

          {description ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Description
              </p>
              {description}
            </div>
          ) : null}

          {!detailsValid ? (
            <StatusAlert variant="info">
              Complete exam details (title, department, target years) on the previous step before
              submitting.
            </StatusAlert>
          ) : null}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(isManualExam ? 'questions' : 'details')}>
              ← Back
            </Button>
            <Button
              disabled={submitting || !canSubmit}
              onClick={() => void submitExam()}
              className="bg-emerald-700 hover:bg-emerald-800 text-white min-w-[11rem]"
            >
              {submitting ? 'Submitting…' : 'Submit for approval'}
            </Button>
          </div>
        </Card>
      ) : null}

      {!isManualExam && canProceedFromQuestions ? (
        <div className="sticky bottom-4 z-20 rounded-xl border border-emerald-200 bg-emerald-50/95 backdrop-blur-sm p-4 shadow-lg shadow-emerald-900/10 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-emerald-950">
            <strong>{validQuestionCount} MCQs</strong> ready · sent to admin after you submit
            {!detailsValid ? (
              <span className="block text-amber-900 text-xs mt-0.5">
                Complete title, department, target years, and syllabus topics to enable submit.
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep('review')}>
              Review
            </Button>
            <Button
              size="sm"
              disabled={submitting || !canSubmit}
              onClick={() => void submitExam()}
              className="bg-emerald-700 hover:bg-emerald-800 text-white min-w-[10rem]"
            >
              {submitting ? 'Submitting…' : 'Submit for approval'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-800 mb-1">{label}</label>
      {hint ? <p className="text-xs text-slate-500 mb-2">{hint}</p> : null}
      {children}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </p>
      <div className="text-sm text-slate-900 font-medium">{children}</div>
    </div>
  );
}

function Stepper({
  steps,
  current,
  onSelect,
  canEnter,
}: {
  steps: Array<{ id: Step; label: string; hint: string }>;
  current: Step;
  onSelect: (s: Step) => void;
  canEnter: Record<Step, boolean>;
}) {
  return (
    <ol
      className={cn(
        'grid gap-2 rounded-xl border border-slate-200 bg-white p-2',
        steps.length === 1 ? 'grid-cols-1' : steps.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
      )}
    >
      {steps.map((s, idx) => {
        const active = current === s.id;
        const enabled = canEnter[s.id];
        return (
          <li key={s.id}>
            <button
              type="button"
              disabled={!enabled}
              onClick={() => enabled && onSelect(s.id)}
              className={cn(
                'w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                active && 'bg-[#1e3a5f] text-white',
                !active && enabled && 'hover:bg-slate-50 text-slate-800',
                !enabled && 'opacity-50 cursor-not-allowed text-slate-500',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  active
                    ? 'bg-white text-[#0c2340]'
                    : 'bg-[#1e3a5f]/10 text-[#1e3a5f]',
                )}
              >
                {idx + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight">{s.label}</span>
                <span
                  className={cn(
                    'mt-0.5 block text-[11px] leading-snug',
                    active ? 'text-white/80' : 'text-slate-500',
                  )}
                >
                  {s.hint}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
