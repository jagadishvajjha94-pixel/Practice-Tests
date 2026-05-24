'use client';

import { MCQ_UPLOAD_FORMAT_HINT } from '@/lib/exam-builder/parse-exam-text';

export function McqUploadFormatGuide({ className = '' }: { className?: string }) {
  return (
    <details className={`rounded-lg border border-slate-200 bg-slate-50/90 text-xs text-slate-700 ${className}`}>
      <summary className="cursor-pointer px-3 py-2 font-semibold text-[#0c2340]">
        How to format PDF / Word / CSV for upload
      </summary>
      <pre className="px-3 pb-3 whitespace-pre-wrap font-sans leading-relaxed">{MCQ_UPLOAD_FORMAT_HINT}</pre>
    </details>
  );
}
