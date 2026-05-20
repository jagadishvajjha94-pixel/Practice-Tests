'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type SyllabusTopicOption = {
  id: string;
  slug: string;
  name: string;
  question_count: number;
};

type SyllabusPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testName: string;
  topics: SyllabusTopicOption[];
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
};

export function SyllabusPickerDialog({
  open,
  onOpenChange,
  testName,
  topics,
  selectedIds,
  onConfirm,
}: SyllabusPickerDialogProps) {
  const [draft, setDraft] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (open) setDraft(selectedIds);
  }, [open, selectedIds]);

  const toggle = (id: string) => {
    setDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectedCount = draft.length;
  const totalQuestions = useMemo(
    () => topics.filter((t) => draft.includes(t.id)).reduce((acc, t) => acc + t.question_count, 0),
    [topics, draft],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{testName} — select syllabus</DialogTitle>
          <DialogDescription>
            Choose the units to include. Each unit contributes questions to the paper. Topics stay
            non-repetitive across slots when you pick a different slot for each sitting.
          </DialogDescription>
        </DialogHeader>

        {topics.length === 0 ? (
          <p className="text-sm text-slate-600">
            No syllabus topics found. Run migration 016 and tag questions in the bank.
          </p>
        ) : (
          <div className="grid gap-2 max-h-[50vh] overflow-y-auto pr-1">
            {topics.map((topic) => {
              const selected = draft.includes(topic.id);
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => toggle(topic.id)}
                  className={cn(
                    'flex items-start justify-between gap-3 rounded-lg border p-3 text-left transition',
                    selected
                      ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 ring-1 ring-[#1e3a5f]/20'
                      : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <div>
                    <p className="font-semibold text-sm text-[#0c2340]">{topic.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{topic.question_count} in bank</p>
                  </div>
                  {selected ? <Badge tone="success">Selected</Badge> : null}
                </button>
              );
            })}
          </div>
        )}

        <p className="text-xs text-slate-600">
          {selectedCount} topic{selectedCount === 1 ? '' : 's'} selected · {totalQuestions} total
          questions available in bank
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={selectedCount === 0}
            onClick={() => {
              onConfirm(draft);
              onOpenChange(false);
            }}
            className="bg-[#1e3a5f] hover:bg-[#16304f]"
          >
            Apply syllabus ({selectedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
