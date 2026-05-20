/**
 * Official RMSET / RCE-RMSET briefing for students before starting the exam.
 * Ramachandra Merit Scholarship Eligibility Test — Tier 4 scholarship pathway.
 */

import { RMSET_CATEGORY_SLUG } from '@/lib/rmset/types';

export const RMSET_FULL_NAME =
  'Ramachandra Merit Scholarship Eligibility Test (RCE-RMSET)';

export const RMSET_PURPOSE_SHORT =
  'For Category B (non-EAPCET) candidates and admitted students not qualifying under EAPCET-based RMSR — merit-based financial assistance tied to credentials, talent, and achievements.';

export const RMSET_ELIGIBILITY_ITEMS = [
  'Admitted to RCE(A), except those already eligible for RMSR Tier 1–3.',
  'NCC / NSS — certificate proof required.',
  'Strong extra-curricular record or recognitions.',
  'Best rankers who opted / were elected in counselling Phase 2 for RCE(A).',
  'Other criteria as approved by management.',
] as const;

export const RMSET_PROCEDURE_ITEMS = [
  'Tier 4 selection uses rank in RCE(A)–RMSET.',
  'After admission, eligible candidates are invited to apply under Tier 4.',
  'Exam is conducted offline only.',
  'Dates are notified during the admission process.',
] as const;

/** Official scheme — informational for students (portal may deliver MCQ portions online). */
export const RMSET_SCHEME_PARTS = [
  {
    label: 'Part A',
    marks: 30,
    detail: 'MPC multiple-choice questions — 30 questions × 1 mark.',
  },
  {
    label: 'Part B',
    marks: 30,
    detail: 'Objective psychometric test — 30 MCQs × 1 mark.',
  },
  {
    label: 'Part C',
    marks: 40,
    detail:
      'Oral communication — Listening, Reading, Writing, Speaking (10 marks each).',
  },
] as const;

export const RMSET_EVALUATION_NOTE =
  'MCQs are checked against the answer key; descriptive / communication parts are evaluated by subject expertise.';

export const RMSET_SCHOLARSHIP_RULES = [
  'Minimum 65% in Intermediate / 12th to qualify.',
  'Top performers: ₹10,000 scholarship for 1st year B.Tech only (one academic year).',
  'Only five students benefit in a given year under this category.',
  'Not eligible if you already benefited under another RMSR stream.',
] as const;

export function isRmsetTestCategorySlug(slug: string | null | undefined): boolean {
  return slug === RMSET_CATEGORY_SLUG;
}
