import type { ReactNode } from 'react';
import {
  RMSET_ELIGIBILITY_ITEMS,
  RMSET_EVALUATION_NOTE,
  RMSET_FULL_NAME,
  RMSET_PROCEDURE_ITEMS,
  RMSET_PURPOSE_SHORT,
  RMSET_SCHEME_PARTS,
  RMSET_SCHOLARSHIP_RULES,
} from '@/lib/rmset/student-exam-intro';

type Props = {
  /** Narrower layout for pre-start modal on take page */
  compact?: boolean;
  className?: string;
};

export function RmsetExamIntro({ compact = false, className = '' }: Props) {
  return (
    <div
      className={`rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/90 to-white text-slate-800 ${className}`}
    >
      <div className={compact ? 'p-4 space-y-3' : 'p-5 sm:p-6 space-y-4'}>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-800">
            RCE-RMSET · Tier 4 scholarship eligibility
          </p>
          <h2 className={`font-black text-[#0c2340] mt-1 ${compact ? 'text-base' : 'text-lg sm:text-xl'}`}>
            {RMSET_FULL_NAME}
          </h2>
          <p className="text-sm text-slate-700 mt-2 leading-relaxed">{RMSET_PURPOSE_SHORT}</p>
        </div>

        <Section title="Eligibility" compact={compact}>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
            {RMSET_ELIGIBILITY_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section title="Procedure" compact={compact}>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
            {RMSET_PROCEDURE_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section title="Scheme of evaluation · 100 marks" compact={compact}>
          <div className="space-y-2 text-sm">
            {RMSET_SCHEME_PARTS.map((p) => (
              <div key={p.label} className="rounded-lg border border-slate-100 bg-white/80 px-3 py-2">
                <p className="font-semibold text-[#0c2340]">
                  {p.label} — {p.marks} marks
                </p>
                <p className="text-slate-600 mt-0.5 text-xs sm:text-sm">{p.detail}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-3 leading-relaxed">{RMSET_EVALUATION_NOTE}</p>
        </Section>

        <Section title="Scholarship & qualification" compact={compact}>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
            {RMSET_SCHOLARSHIP_RULES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>

        {!compact ? (
          <p className="text-xs text-slate-500 border-t border-violet-100 pt-3">
            Read carefully, then proceed. If you have questions, contact the examination cell before starting.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Section({
  title,
  compact,
  children,
}: {
  title: string;
  compact: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <p
        className={`font-bold uppercase tracking-wide text-slate-500 ${compact ? 'text-[10px] mb-1.5' : 'text-xs mb-2'}`}
      >
        {title}
      </p>
      {children}
    </div>
  );
}
