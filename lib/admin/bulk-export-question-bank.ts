import JSZip from 'jszip';
import { buildQuestionBankCsv } from '@/lib/admin/question-bank-catalog';
import { fetchTopicQuestionBankExport } from '@/lib/admin/fetch-question-bank-export';
import { downloadQuestionBankCsvClient } from '@/lib/admin/export-question-bank-csv-client';
import { getQuestionBankPdfBlob } from '@/lib/admin/export-question-bank-pdf';
import { buildQuestionBankWordHtml } from '@/lib/admin/export-question-bank-word';

export type TopicExportTarget = {
  slug: string;
  name: string;
  question_count: number;
};

export type BulkExportFormat = 'pdf' | 'csv' | 'doc';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function downloadAllTopicBanksZip(
  topics: TopicExportTarget[],
  format: BulkExportFormat,
  onProgress?: (current: number, total: number, topicName: string) => void,
): Promise<{ filesAdded: number; skipped: number }> {
  const withQuestions = topics.filter((t) => t.question_count > 0);
  if (withQuestions.length === 0) {
    throw new Error('No questions in the bank yet. Click “Load 150 MCQs / topic” first.');
  }

  const zip = new JSZip();
  const date = new Date().toISOString().slice(0, 10);
  let filesAdded = 0;
  let skipped = 0;

  for (let i = 0; i < withQuestions.length; i++) {
    const topic = withQuestions[i]!;
    onProgress?.(i + 1, withQuestions.length, topic.name);

    try {
      const rows = await fetchTopicQuestionBankExport(topic.slug);
      if (rows.length === 0) {
        skipped += 1;
        continue;
      }

      const safeName = slugify(topic.name) || topic.slug;

      if (format === 'csv') {
        zip.file(`${safeName}.csv`, buildQuestionBankCsv(rows));
      } else if (format === 'doc') {
        zip.file(
          `${safeName}.doc`,
          buildQuestionBankWordHtml({
            title: `Question bank — ${topic.name}`,
            subtitle: `${rows.length} MCQs with options, answers, and explanations`,
            rows,
          }),
        );
      } else {
        const blob = getQuestionBankPdfBlob({
          title: `Question bank — ${topic.name}`,
          subtitle: `${rows.length} MCQs with options, answers, and explanations`,
          rows,
        });
        zip.file(`${safeName}.pdf`, blob);
      }

      filesAdded += 1;
      await sleep(80);
    } catch {
      skipped += 1;
    }
  }

  if (filesAdded === 0) {
    throw new Error('Could not export any topic. Check that the bank is seeded and you are signed in as admin.');
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `question-bank-all-topics-${format}-${date}.zip`;
  a.click();
  URL.revokeObjectURL(url);

  return { filesAdded, skipped };
}

export async function downloadSingleTopicExport(
  slug: string,
  name: string,
  format: BulkExportFormat,
): Promise<number> {
  const rows = await fetchTopicQuestionBankExport(slug);
  if (rows.length === 0) {
    throw new Error(`No questions found for “${name}”. Seed the bank or pick another topic.`);
  }

  const payload = {
    title: `Question bank — ${name}`,
    subtitle: `${rows.length} MCQs with options, answers, and explanations`,
    rows,
  };

  if (format === 'csv') {
    downloadQuestionBankCsvClient(rows, name);
  } else if (format === 'doc') {
    const { downloadQuestionBankWord } = await import('@/lib/admin/export-question-bank-word');
    downloadQuestionBankWord(payload, slugify(name));
  } else {
    const { downloadQuestionBankPdf } = await import('@/lib/admin/export-question-bank-pdf');
    downloadQuestionBankPdf(payload);
  }

  return rows.length;
}
