'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusAlert } from '@/components/ui/status-alert';
import {
  SyllabusPickerDialog,
  type SyllabusTopicOption,
} from '@/components/exam-builder/syllabus-picker-dialog';
import {
  EXAM_BUILDER_SLOTS,
  EXAM_BUILDER_TEST_TYPES,
  getExamBuilderTestType,
} from '@/lib/exam-builder/test-catalog';
import type { FacultyExamQuestion } from '@/lib/faculty-exams';

type CatalogResponse = {
  testTypes?: typeof EXAM_BUILDER_TEST_TYPES;
  slots?: typeof EXAM_BUILDER_SLOTS;
  syllabusByTestType?: Record<string, SyllabusTopicOption[]>;
};

export type ExamBuilderControlsProps = {
  testType: string;
  onTestTypeChange: (id: string) => void;
  slotKey: string;
  onSlotKeyChange: (key: string) => void;
  selectedTopicIds: string[];
  onSelectedTopicIdsChange: (ids: string[]) => void;
  questionsPerTopic: number;
  onQuestionsPerTopicChange: (n: number) => void;
  onQuestionsGenerated: (questions: FacultyExamQuestion[], warnings: string[]) => void;
  compact?: boolean;
};

export function ExamBuilderControls({
  testType,
  onTestTypeChange,
  slotKey,
  onSlotKeyChange,
  selectedTopicIds,
  onSelectedTopicIdsChange,
  questionsPerTopic,
  onQuestionsPerTopicChange,
  onQuestionsGenerated,
  compact = false,
}: ExamBuilderControlsProps) {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [syllabusOpen, setSyllabusOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/exam-builder/catalog')
      .then((r) => (r.ok ? r.json() : null))
      .then((json: CatalogResponse | null) => {
        if (json) setCatalog(json);
      });
  }, []);

  const testDef = getExamBuilderTestType(testType);
  const syllabusTopics = catalog?.syllabusByTestType?.[testType] ?? [];

  const selectedTopicNames = useMemo(
    () =>
      syllabusTopics
        .filter((t) => selectedTopicIds.includes(t.id))
        .map((t) => t.name),
    [syllabusTopics, selectedTopicIds],
  );

  const handleTestTypeChange = (id: string) => {
    onTestTypeChange(id);
    onSelectedTopicIdsChange([]);
    setInfo(null);
    setError(null);
    const def = getExamBuilderTestType(id);
    if (def?.requiresSyllabus) {
      onQuestionsPerTopicChange(def.defaultQuestionsPerTopic);
      window.setTimeout(() => setSyllabusOpen(true), 100);
    }
  };

  const generateQuestions = async () => {
    setError(null);
    setInfo(null);
    if (!testDef?.requiresSyllabus) return;
    if (!selectedTopicIds.length) {
      setError('Select syllabus topics first.');
      setSyllabusOpen(true);
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/exam-builder/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testType,
          topicIds: selectedTopicIds,
          slotKey,
          questionsPerTopic,
        }),
      });
      const json = (await res.json()) as {
        questions?: FacultyExamQuestion[];
        warnings?: string[];
        error?: string;
        total?: number;
      };
      if (!res.ok) throw new Error(json.error ?? 'Could not generate paper');
      onQuestionsGenerated(json.questions ?? [], json.warnings ?? []);
      setInfo(
        `Generated ${json.total ?? 0} questions for ${slotKey.replace('-', ' ')} — topics stay fresh per slot.`,
      );
      if (json.warnings?.length) {
        setInfo(`${json.warnings.join(' ')} Generated ${json.total ?? 0} questions.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const testTypes = catalog?.testTypes ?? EXAM_BUILDER_TEST_TYPES;
  const slots = catalog?.slots ?? EXAM_BUILDER_SLOTS;

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5 rounded-xl border border-slate-200 bg-slate-50/60 p-5'}>
      <div>
        <h3 className="text-sm font-bold text-[#0c2340]">Test type & slot</h3>
        {!compact ? (
          <p className="text-xs text-slate-500 mt-0.5">
            Pick which test to run. Aptitude and other syllabus tests open a topic picker popup.
          </p>
        ) : null}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Test to initiate
          </label>
          <select
            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            value={testType}
            onChange={(e) => handleTestTypeChange(e.target.value)}
          >
            {testTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.name}
              </option>
            ))}
          </select>
          {testDef ? <p className="text-xs text-slate-500 mt-1">{testDef.description}</p> : null}
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Exam slot (non-repetitive sets)
          </label>
          <select
            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            value={slotKey}
            onChange={(e) => onSlotKeyChange(e.target.value)}
          >
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Each slot draws fresh questions so topics do not repeat across sittings.
          </p>
        </div>
      </div>

      {testDef?.requiresSyllabus ? (
        <>
          <div className="grid sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Questions per topic
              </label>
              <Input
                type="number"
                min={1}
                max={50}
                className="mt-1"
                value={questionsPerTopic}
                onChange={(e) => onQuestionsPerTopicChange(Number(e.target.value) || 5)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setSyllabusOpen(true)}>
                Select syllabus topics
              </Button>
              <Button
                type="button"
                disabled={generating}
                onClick={() => void generateQuestions()}
                className="bg-[#1e3a5f] hover:bg-[#16304f]"
              >
                {generating ? 'Building paper…' : 'Generate question paper'}
              </Button>
            </div>
          </div>

          {selectedTopicNames.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedTopicNames.map((name) => (
                <Badge key={name} tone="brand" className="text-[11px]">
                  {name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              No syllabus selected yet — click &quot;Select syllabus topics&quot; to choose units.
            </p>
          )}
        </>
      ) : null}

      {error ? <StatusAlert variant="error">{error}</StatusAlert> : null}
      {info ? <StatusAlert variant="info">{info}</StatusAlert> : null}

      <SyllabusPickerDialog
        open={syllabusOpen}
        onOpenChange={setSyllabusOpen}
        testName={testDef?.name ?? 'Exam'}
        topics={syllabusTopics}
        selectedIds={selectedTopicIds}
        onConfirm={onSelectedTopicIdsChange}
      />
    </div>
  );
}
