/** ElevateX — Talent Challenge Exam (placement-readiness). RMSET uses separate branding. */

export const ELEVATEX_EXAM_NAME = 'ElevateX';
export const ELEVATEX_TAGLINE =
  'Industry-aligned talent challenge to identify Day-1-ready candidates for priority placements.';

export const ELEVATEX_SHORT_OBJECTIVE =
  'ElevateX identifies high-potential students for structured industry training and priority access to top job packages, internships, and hackathons — built around what recruiters expect from a Day-1 hire.';

export const ELEVATEX_REGISTRATION = {
  eligibility: 'All branches · III Year 1st Semester (upcoming batch)',
  testDates: '25 & 26 May 2026',
  timeSlots: 'As listed in the registration form',
  mode: 'In-campus · Offline',
  duration: '1 hour · 100 marks',
  passingNote: 'Cutoff as announced by the examination cell',
} as const;

export const ELEVATEX_TEST_COMPONENTS = [
  { name: 'Technical Assessment', marks: 20, description: 'Branch-specific MCQs' },
  { name: 'Aptitude', marks: 20, description: 'Quantitative, logical reasoning & data interpretation' },
  { name: 'Logic Building', marks: 15, description: 'Problem-solving & pattern recognition' },
  { name: 'Intelligence (IQ)', marks: 15, description: 'Abstract, spatial & analytical reasoning' },
  { name: 'Psychometric', marks: 15, description: 'Personality, behaviour & situational judgement' },
  { name: 'Speaking / Communication', marks: 15, description: 'Verbal ability, comprehension & expression' },
] as const;

export const ELEVATEX_MODULE_KEY = 'placement_full' as const;

export function isElevateXModule(moduleKey: string | undefined | null): boolean {
  return moduleKey === ELEVATEX_MODULE_KEY;
}
