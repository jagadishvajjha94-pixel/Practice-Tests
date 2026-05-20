/** Syllabus units grouped by test type — slugs must match question_tags.slug in the DB. */
export const SYLLABUS_GROUPS = {
  aptitude: [
    { slug: 'aptitude-percentages', name: 'Percentages' },
    { slug: 'aptitude-profit-loss', name: 'Profit & Loss' },
    { slug: 'aptitude-time-work', name: 'Time & Work' },
    { slug: 'aptitude-speed-distance', name: 'Time, Speed & Distance' },
    { slug: 'aptitude-ratio-proportion', name: 'Ratio & Proportion' },
    { slug: 'aptitude-number-systems', name: 'Number Systems' },
    { slug: 'aptitude-interest', name: 'Simple & Compound Interest' },
    { slug: 'aptitude-averages', name: 'Averages' },
    { slug: 'aptitude-pnc', name: 'Permutations & Combinations' },
    { slug: 'aptitude-probability', name: 'Probability' },
    { slug: 'aptitude-mixtures', name: 'Mixtures & Allegations' },
    { slug: 'aptitude-partnership', name: 'Partnership' },
  ],
  logical: [
    { slug: 'logical-deduction', name: 'Logical Deduction' },
    { slug: 'logical-seating', name: 'Seating Arrangement' },
    { slug: 'logical-blood-relations', name: 'Blood Relations' },
    { slug: 'logical-syllogisms', name: 'Syllogisms' },
    { slug: 'logical-data-interpretation', name: 'Data Interpretation' },
    { slug: 'logical-reasoning', name: 'Logical Reasoning (general)' },
  ],
  technical: [
    { slug: 'technical-programming', name: 'Programming' },
    { slug: 'technical-dbms', name: 'DBMS' },
    { slug: 'technical-os', name: 'Operating Systems' },
    { slug: 'technical-networks', name: 'Computer Networks' },
    { slug: 'dsa', name: 'Data Structures & Algorithms' },
    { slug: 'dbms', name: 'Database Management' },
    { slug: 'operating-systems', name: 'OS Fundamentals' },
    { slug: 'computer-science', name: 'Computer Science (general)' },
  ],
  verbal: [
    { slug: 'verbal-rc', name: 'Reading Comprehension' },
    { slug: 'verbal-vocabulary', name: 'Synonyms & Antonyms' },
    { slug: 'verbal-grammar', name: 'Sentence Correction' },
    { slug: 'english-grammar', name: 'English Grammar' },
    { slug: 'verbal-ability', name: 'Verbal Ability (general)' },
  ],
  rmset: [] as { slug: string; name: string }[],
} as const;

export type SyllabusGroupKey = keyof typeof SYLLABUS_GROUPS;

export function syllabusUnitsForGroup(group: SyllabusGroupKey | null) {
  if (!group) return [];
  if (group === 'rmset') return [];
  return SYLLABUS_GROUPS[group];
}
