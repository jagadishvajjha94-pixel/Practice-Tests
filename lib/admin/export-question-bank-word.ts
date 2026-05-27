import type { QuestionBankExportRow } from '@/lib/admin/question-bank-catalog';
import type { QuestionBankPdfOptions } from '@/lib/admin/export-question-bank-pdf';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function optionsForRow(q: QuestionBankExportRow): { a: string; b: string; c: string; d: string } {
  return {
    a: q.option_a ?? q.options?.[0] ?? '',
    b: q.option_b ?? q.options?.[1] ?? '',
    c: q.option_c ?? q.options?.[2] ?? '',
    d: q.option_d ?? q.options?.[3] ?? '',
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function buildQuestionBankWordHtml(options: QuestionBankPdfOptions): string {
  const { title, subtitle, rows } = options;
  const generatedAt = new Date().toLocaleString();

  const questionBlocks = rows
    .map((q, i) => {
      const { a, b, c, d } = optionsForRow(q);
      const answerLetter = q.correct_answer.trim().toUpperCase().slice(0, 1);
      const opt = (letter: string, text: string) => {
        if (!text) return '';
        const bold = letter === answerLetter ? 'font-weight:bold;color:#166534;' : '';
        return `<p style="margin:4px 0 4px 16px;${bold}">${letter}) ${escapeHtml(text)}</p>`;
      };
      return `
      <div style="margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
        <p style="font-weight:bold;color:#0c2340;margin:0 0 6px;">Q${i + 1}. ${escapeHtml(q.difficulty)} · ${escapeHtml(q.type)}</p>
        <p style="margin:0 0 8px;">${escapeHtml(q.question_text)}</p>
        ${opt('A', a)}${opt('B', b)}${opt('C', c)}${opt('D', d)}
        <p style="margin:8px 0 4px;"><strong>Correct answer:</strong> ${escapeHtml(q.correct_answer)}</p>
        ${q.explanation?.trim() ? `<p style="margin:4px 0;color:#475569;font-size:11pt;"><strong>Explanation:</strong> ${escapeHtml(q.explanation.trim())}</p>` : ''}
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="UTF-8"/><title>${escapeHtml(title)}</title></head>
<body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#0f172a;max-width:800px;margin:24px;">
  <h1 style="color:#0c2340;font-size:18pt;margin:0 0 8px;">${escapeHtml(title)}</h1>
  <p style="color:#64748b;margin:0 0 4px;">${escapeHtml(subtitle ?? '')}</p>
  <p style="color:#64748b;margin:0 0 20px;">Generated ${escapeHtml(generatedAt)} · ${rows.length} questions</p>
  ${questionBlocks}
</body></html>`;
}

export function downloadQuestionBankWord(options: QuestionBankPdfOptions, fileBase?: string): void {
  const base = fileBase ?? slugify(options.title) ?? 'question-bank';
  const datePart = new Date().toISOString().slice(0, 10);
  const html = buildQuestionBankWordHtml(options);
  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${base}-${datePart}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}
