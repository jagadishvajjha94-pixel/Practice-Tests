import { jsPDF } from 'jspdf';
import type { QuestionBankExportRow } from '@/lib/admin/question-bank-catalog';

export type QuestionBankPdfOptions = {
  title: string;
  subtitle?: string;
  rows: QuestionBankExportRow[];
};

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

function ensureSpace(doc: jsPDF, y: number, needed: number, margin: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - margin) {
    doc.addPage();
    return margin;
  }
  return y;
}

function writeLines(
  doc: jsPDF,
  lines: string | string[],
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  margin: number,
  fontSize = 10,
): number {
  const parts = Array.isArray(lines) ? lines : doc.splitTextToSize(lines, maxWidth);
  doc.setFontSize(fontSize);
  for (const line of parts) {
    y = ensureSpace(doc, y, lineHeight + 2, margin);
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

export function buildQuestionBankPdfDoc(options: QuestionBankPdfOptions): jsPDF {
  const { title, subtitle, rows } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const margin = 40;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const lineHeight = 12;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, margin, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  if (subtitle) {
    y = writeLines(doc, subtitle, margin, y, maxWidth, lineHeight, margin, 10);
    y += 4;
  }
  y = writeLines(
    doc,
    `Generated ${new Date().toLocaleString()} · ${rows.length} question${rows.length === 1 ? '' : 's'}`,
    margin,
    y,
    maxWidth,
    lineHeight,
    margin,
    10,
  );
  doc.setTextColor(0, 0, 0);
  y += 10;

  for (let i = 0; i < rows.length; i++) {
    const q = rows[i]!;
    const { a, b, c, d } = optionsForRow(q);
    const opts = [
      a ? `A) ${a}` : null,
      b ? `B) ${b}` : null,
      c ? `C) ${c}` : null,
      d ? `D) ${d}` : null,
    ].filter(Boolean) as string[];

    y = ensureSpace(doc, y, 60, margin);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, doc.internal.pageSize.getWidth() - margin, y);
    y += 14;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const meta = [q.section, q.topic].filter(Boolean).join(' · ');
    const head = `Q${i + 1}. ${q.difficulty} · ${q.type}${meta ? ` · ${meta}` : ''}`;
    y = writeLines(doc, head, margin, y, maxWidth, lineHeight, margin, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y = writeLines(doc, q.question_text, margin, y + 4, maxWidth, lineHeight, margin, 10);

    const answerLetter = q.correct_answer.trim().toUpperCase().slice(0, 1);
    for (const opt of opts) {
      const isCorrect = answerLetter.length === 1 && opt.startsWith(`${answerLetter})`);
      if (isCorrect) doc.setFont('helvetica', 'bold');
      y = writeLines(doc, opt, margin + 8, y + 2, maxWidth - 8, lineHeight, margin, 10);
      doc.setFont('helvetica', 'normal');
    }

    y = writeLines(
      doc,
      `Correct answer: ${q.correct_answer}`,
      margin,
      y + 4,
      maxWidth,
      lineHeight,
      margin,
      10,
    );

    if (q.explanation?.trim()) {
      doc.setTextColor(60, 60, 60);
      y = writeLines(
        doc,
        `Explanation: ${q.explanation.trim()}`,
        margin,
        y + 2,
        maxWidth,
        lineHeight,
        margin,
        9,
      );
      doc.setTextColor(0, 0, 0);
    }

    y += 6;
  }

  return doc;
}

export function getQuestionBankPdfBlob(options: QuestionBankPdfOptions): Blob {
  return buildQuestionBankPdfDoc(options).output('blob');
}

export function downloadQuestionBankPdf(options: QuestionBankPdfOptions): void {
  const namePart = slugify(options.title) || 'question-bank';
  const datePart = new Date().toISOString().slice(0, 10);
  buildQuestionBankPdfDoc(options).save(`${namePart}-${datePart}.pdf`);
}
