import { fetchWithAuth } from '@/lib/fetch-with-auth';
import {
  QUESTION_BANK_SECTION_LABELS,
  sectionKeyForTopicSlug,
  type QuestionBankExportRow,
  type QuestionBankRow,
} from '@/lib/admin/question-bank-catalog';

type TopicBatch = {
  topic: { id: string; slug: string; name: string };
  total: number;
  questions: QuestionBankRow[];
};

export async function fetchTopicQuestionBankExport(
  topicSlug: string,
): Promise<QuestionBankExportRow[]> {
  const allRows: QuestionBankRow[] = [];
  let pageOffset = 0;
  const pageSize = 500;
  let topicName = topicSlug;
  let total = 0;

  for (;;) {
    const q = new URLSearchParams({
      topicSlug,
      offset: String(pageOffset),
      limit: String(pageSize),
    });
    const res = await fetchWithAuth(`/api/admin/question-bank?${q.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(json.error ?? `Could not load topic (${res.status})`);
    }
    const batch = (await res.json()) as TopicBatch;
    if (!batch.topic) throw new Error('Topic not found');
    topicName = batch.topic.name;
    total = batch.total;
    allRows.push(...batch.questions);
    if (allRows.length >= total || batch.questions.length < pageSize) break;
    pageOffset += pageSize;
  }

  const sectionName =
    topicSlug === 'uncategorized'
      ? QUESTION_BANK_SECTION_LABELS.uncategorized
      : QUESTION_BANK_SECTION_LABELS[sectionKeyForTopicSlug(topicSlug)];

  return allRows.map((q) => ({
    ...q,
    section: sectionName,
    topic: topicName,
  }));
}

export async function fetchFullQuestionBankExport(): Promise<QuestionBankExportRow[]> {
  const res = await fetchWithAuth('/api/admin/question-bank?export=json&all=1', {
    cache: 'no-store',
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status === 504) {
      throw new Error(
        'Full bank export timed out. Download one topic as PDF instead, or use CSV for the full bank.',
      );
    }
    throw new Error(json.error ?? `Could not load full bank (${res.status})`);
  }
  const data = (await res.json()) as { rows: QuestionBankExportRow[] };
  return data.rows ?? [];
}
