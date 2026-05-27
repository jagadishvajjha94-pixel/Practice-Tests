import { buildQuestionBankCsv, type QuestionBankExportRow } from '@/lib/admin/question-bank-catalog';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function downloadQuestionBankCsvClient(
  rows: QuestionBankExportRow[],
  title: string,
): void {
  const csv = buildQuestionBankCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(title) || 'question-bank'}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
