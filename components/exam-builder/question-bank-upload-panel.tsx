'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { StatusAlert } from '@/components/ui/status-alert';
import { Badge } from '@/components/ui/badge';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const SAMPLE_CSV = `question_text,option_a,option_b,option_c,option_d,correct_answer,explanation
"What is 15% of 200?","15","20","30","45","C","15% of 200 = 30"
"Which data structure is LIFO?","Queue","Stack","Array","Graph","B","Stack is last-in-first-out"`;

type QuestionBankUploadPanelProps = {
  /** Syllabus topic ids (UUIDs or slugs) — same as exam builder selection. */
  tagIds: string[];
  /** When false, panel explains that topics must be chosen first. */
  syllabusRequired?: boolean;
  className?: string;
};

export function QuestionBankUploadPanel({
  tagIds,
  syllabusRequired = true,
  className = '',
}: QuestionBankUploadPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showSample, setShowSample] = useState(false);

  const canUpload = !syllabusRequired || tagIds.length > 0;

  const runUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setInfo(null);
    setUploading(true);

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
      form.append('tagIds', JSON.stringify(tagIds));

      const res = await fetch('/api/exam-builder/bank-upload', {
        method: 'POST',
        headers,
        body: form,
      });
      const json = (await res.json()) as {
        ok?: boolean;
        inserted?: number;
        warnings?: string[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error ?? 'Upload failed');
      }

      setInfo(
        `Saved ${json.inserted ?? 0} question(s) to the bank and linked them to your selected syllabus topic(s). ${(json.warnings ?? []).join(' ')}`.trim(),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 to-white p-5 space-y-4 lux-surface ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-[#0c2340]">Question bank upload</h3>
          <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
            Add MCQs so <strong>Draw from bank</strong> can syllabus-pull them later. Accepted:{' '}
            <strong>.csv</strong>, <strong>.pdf</strong>, <strong>.docx</strong>, <strong>.txt</strong>. Legacy{' '}
            <strong>.doc</strong>: save as .docx or PDF first.
          </p>
        </div>
        <Badge tone="brand">Syllabus-tagged</Badge>
      </div>

      {!canUpload ? (
        <StatusAlert variant="info" className="border-amber-200 bg-amber-50 text-amber-950">
          Select syllabus topics in the controls above — every uploaded question gets those tags so draws stay
          topic-accurate.
        </StatusAlert>
      ) : (
        <p className="text-[11px] text-slate-500">
          Tagging {tagIds.length} topic(s): draws will match these alongside any existing bank links.
        </p>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <div
          className={`relative inline-flex h-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm hover:bg-accent/10 ${
            uploading || !canUpload ? 'pointer-events-none cursor-not-allowed opacity-50' : ''
          }`}
        >
          <input
            type="file"
            aria-label="Upload questions file"
            accept=".csv,.pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv"
            disabled={uploading || !canUpload}
            onChange={(ev) => void runUpload(ev)}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          <span className="pointer-events-none select-none" aria-hidden="true">
            {uploading ? 'Uploading…' : 'Choose file'}
          </span>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowSample((s) => !s)}>
          {showSample ? 'Hide' : 'Show'} CSV sample
        </Button>
      </div>

      {showSample ? (
        <pre className="text-[11px] leading-relaxed rounded-lg bg-slate-900 text-slate-100 p-3 overflow-x-auto max-h-40 overflow-y-auto">
          {SAMPLE_CSV}
        </pre>
      ) : null}

      {error ? <StatusAlert variant="error">{error}</StatusAlert> : null}
      {info ? <StatusAlert variant="info">{info}</StatusAlert> : null}

      <p className="text-[10px] text-slate-400">
        PDF / Word: same layout as faculty PDF import — numbered questions, options A–D, optional &quot;Answer: B&quot;
        lines per block.
      </p>
    </div>
  );
}
