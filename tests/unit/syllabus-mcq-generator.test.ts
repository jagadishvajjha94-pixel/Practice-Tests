import { describe, expect, it } from 'vitest';
import { allSyllabusUnits } from '@/lib/exam-builder/syllabus';
import { generateSyllabusMcqsForSlug } from '@/lib/question-bank/syllabus-mcq-generator';

describe('generateSyllabusMcqsForSlug', () => {
  it('produces unique stems for a topic sample', () => {
    const mcqs = generateSyllabusMcqsForSlug('aptitude-percentages', 'Percentages', 80);
    const texts = mcqs.map((q) => q.question_text.trim().toLowerCase());
    expect(mcqs.length).toBe(80);
    expect(new Set(texts).size).toBe(80);
  });

  it('covers syllabus slugs with at least 20 unique items', () => {
    const units = allSyllabusUnits().slice(0, 5);
    for (const unit of units) {
      const mcqs = generateSyllabusMcqsForSlug(unit.slug, unit.name, 20);
      expect(mcqs.length).toBe(20);
      expect(new Set(mcqs.map((q) => q.question_text)).size).toBe(20);
    }
  });
});
