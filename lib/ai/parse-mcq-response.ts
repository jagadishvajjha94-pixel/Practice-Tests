import type { Question } from '@/lib/types';

export function parseMcqsFromAiText(
  text: string,
  categoryId: string,
): Omit<Question, 'id' | 'created_at' | 'updated_at'>[] {
  const trimmed = text.trim();
  try {
    const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const arr = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
      return arr.map((row) => normalizeRow(row, categoryId)).filter(Boolean) as Omit<
        Question,
        'id' | 'created_at' | 'updated_at'
      >[];
    }
  } catch {
    /* fall through */
  }

  const blocks = trimmed.split(/\n(?=Q\d+[:.)]|\d+\.)/i).filter((b) => b.trim());
  return blocks
    .map((block) => parseBlock(block, categoryId))
    .filter(Boolean) as Omit<Question, 'id' | 'created_at' | 'updated_at'>[];
}

function normalizeRow(row: Record<string, unknown>, categoryId: string) {
  const question_text = String(row.question_text ?? row.question ?? '').trim();
  if (!question_text) return null;
  const optionsRaw = row.options;
  const options = Array.isArray(optionsRaw)
    ? optionsRaw.map(String)
    : [row.option_a, row.option_b, row.option_c, row.option_d].filter(Boolean).map(String);
  const correct = String(row.correct_answer ?? row.answer ?? 'A').trim();
  return {
    category_id: categoryId,
    difficulty: (row.difficulty as Question['difficulty']) ?? 'medium',
    question_text,
    type: 'MCQ' as const,
    options: options.length >= 2 ? options : ['A', 'B', 'C', 'D'],
    correct_answer: correct,
    explanation: row.explanation ? String(row.explanation) : null,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : null,
  };
}

function parseBlock(block: string, categoryId: string) {
  const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const question_text = lines[0].replace(/^Q?\d+[:.)]\s*/i, '');
  const options: string[] = [];
  let correct_answer = 'A';
  let explanation: string | null = null;

  for (const line of lines.slice(1)) {
    const opt = line.match(/^[A-Da-d][).:\s]\s*(.+)/);
    if (opt) options.push(opt[1]);
    const ans = line.match(/^Answer[:\s]+([A-Da-d])/i);
    if (ans) correct_answer = ans[1].toUpperCase();
    const exp = line.match(/^Explanation[:\s]+(.+)/i);
    if (exp) explanation = exp[1];
  }

  if (!question_text || options.length < 2) return null;
  return {
    category_id: categoryId,
    difficulty: 'medium' as const,
    question_text,
    type: 'MCQ' as const,
    options,
    correct_answer,
    explanation,
    tags: null,
  };
}
