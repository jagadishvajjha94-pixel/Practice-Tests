import type { FacultyExamQuestion } from '@/lib/faculty-exams';
import {
  parseMcqCsv as parseMcqCsvCore,
  parseMcqPlainText as parseMcqPlainTextCore,
} from '@/lib/exam-builder/parse-manual-mcqs';

export type ParsedBankUpload = {
  questions: FacultyExamQuestion[];
  warnings: string[];
  format: 'csv' | 'pdf' | 'docx' | 'text';
};

/** Parse spreadsheet rows into MCQs. */
export function parseMcqCsv(text: string): ParsedBankUpload {
  return parseMcqCsvCore(text);
}

export async function extractTextFromUpload(
  buffer: Buffer,
  filename: string,
  mime: string | null,
): Promise<{ text: string; format: ParsedBankUpload['format'] }> {
  const name = filename.toLowerCase();

  const isCsv = name.endsWith('.csv') || mime === 'text/csv' || mime === 'application/vnd.ms-excel';
  const isPdf = name.endsWith('.pdf') || mime === 'application/pdf';
  const isDocx =
    name.endsWith('.docx') ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const isTxt = name.endsWith('.txt') || mime === 'text/plain';

  if (isCsv) {
    throw new Error('Use parseMcqCsv for CSV files');
  }

  if (isPdf) {
    const pdfParse = (await import('pdf-parse')).default as (data: Buffer) => Promise<{ text: string }>;
    const { text } = await pdfParse(buffer);
    return { text, format: 'pdf' };
  }

  if (isDocx) {
    const mammoth = await import('mammoth');
    const { value } = await mammoth.extractRawText({ buffer });
    return { text: value, format: 'docx' };
  }

  if (isTxt) {
    return { text: buffer.toString('utf8'), format: 'text' };
  }

  if (name.endsWith('.doc') && mime === 'application/msword') {
    throw new Error(
      'Legacy .doc is not supported. Save the file as .docx or export as PDF / CSV and upload again.',
    );
  }

  throw new Error('Unsupported format. Upload .csv, .pdf, .docx, or .txt');
}

/** Parse unstructured text (PDF / Word / pasted paper). */
export function parseMcqPlainText(raw: string, format: ParsedBankUpload['format']): ParsedBankUpload {
  const parsed = parseMcqPlainTextCore(raw);
  const warnings = [...parsed.warnings];
  if (parsed.questions.length && format !== 'text') {
    warnings.push(
      `${format.toUpperCase()}: Parsed ${parsed.questions.length} block(s); review answers marked as uncertain.`,
    );
  }
  return { questions: parsed.questions, warnings, format };
}
