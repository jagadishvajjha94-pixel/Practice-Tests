import type { FacultyExamQuestion } from '@/lib/faculty-exams';
import { parseCsvToObjects, type CsvRow } from '@/lib/question-bank/csv-mcq';
import { parseExamTextFromDocument } from '@/lib/faculty/parse-exam-text';

export type ParsedBankUpload = {
  questions: FacultyExamQuestion[];
  warnings: string[];
  format: 'csv' | 'pdf' | 'docx' | 'text';
};

function normalizeAnswer(raw: string): 'A' | 'B' | 'C' | 'D' {
  const s = raw.trim().toUpperCase();
  const letter = s.match(/^([ABCD])\b/)?.[1];
  return (letter ?? 'A') as 'A' | 'B' | 'C' | 'D';
}

function splitPipeOptions(cell: string): [string, string, string, string] | null {
  const parts = cell
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length < 4) return null;
  return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
}

function csvRowToMcq(row: CsvRow): FacultyExamQuestion | null {
  const qt = row.question_text?.trim();
  if (!qt) return null;

  let option_a = row.option_a?.trim() ?? '';
  let option_b = row.option_b?.trim() ?? '';
  let option_c = row.option_c?.trim() ?? '';
  let option_d = row.option_d?.trim() ?? '';

  const optsCell = row.options?.trim();
  if ((!option_a || !option_b || !option_c || !option_d) && optsCell) {
    if (optsCell.startsWith('[')) {
      try {
        const arr = JSON.parse(optsCell) as unknown;
        if (Array.isArray(arr) && arr.length >= 4) {
          option_a = String(arr[0] ?? '');
          option_b = String(arr[1] ?? '');
          option_c = String(arr[2] ?? '');
          option_d = String(arr[3] ?? '');
        }
      } catch {
        /* ignore */
      }
    } else if (optsCell.includes('|')) {
      const sp = splitPipeOptions(optsCell);
      if (sp) {
        [option_a, option_b, option_c, option_d] = sp;
      }
    }
  }

  if (!option_a || !option_b || !option_c || !option_d) return null;

  return {
    question_text: qt,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_answer: normalizeAnswer(row.correct_answer ?? 'A'),
    explanation: row.explanation?.trim() || undefined,
  };
}

/** Parse spreadsheet rows into MCQs. */
export function parseMcqCsv(text: string): ParsedBankUpload {
  const objs = parseCsvToObjects(text);
  const warnings: string[] = [];
  const questions: FacultyExamQuestion[] = [];
  let skipped = 0;

  for (const row of objs) {
    const q = csvRowToMcq(row);
    if (q) questions.push(q);
    else skipped += 1;
  }

  if (skipped && questions.length) {
    warnings.push(`${skipped} CSV row(s) skipped (need question_text and four options).`);
  }
  if (questions.length === 0) {
    warnings.push(
      'No valid CSV MCQs found. Columns: question_text, option_a, option_b, option_c, option_d, correct_answer (or options as "a|b|c|d").',
    );
  }

  return { questions, warnings, format: 'csv' };
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

/** Parse unstructured text (PDF / Word / pasted paper) via the same MCQ rules as faculty PDF import. */
export function parseMcqPlainText(raw: string, format: ParsedBankUpload['format']): ParsedBankUpload {
  const result = parseExamTextFromDocument(raw);
  const warnings = [...result.warnings];
  if (result.questions.length) {
    warnings.push(
      `${format.toUpperCase()}: Parsed ${result.questions.length} block(s); review answers marked as uncertain.`,
    );
  }
  return { questions: result.questions, warnings, format };
}
