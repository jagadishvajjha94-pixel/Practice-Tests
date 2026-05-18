export type ExamContentType = 'mcq' | 'programming';

export type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
};

/** Always available in the UI when Supabase categories cannot be loaded. */
export const DEFAULT_CATEGORY_OPTIONS: CategoryOption[] = [
  { id: 'slug:quantitative', name: 'Quantitative Ability', slug: 'quantitative', icon: '📊' },
  { id: 'slug:verbal', name: 'Verbal Ability', slug: 'verbal', icon: '📖' },
  { id: 'slug:logical', name: 'Logical Reasoning', slug: 'logical', icon: '🧠' },
  { id: 'slug:coding', name: 'Coding / Programming', slug: 'coding', icon: '💻' },
  { id: 'slug:current-affairs', name: 'Current Affairs', slug: 'current-affairs', icon: '📰' },
  { id: 'slug:company-specific', name: 'Company Specific', slug: 'company-specific', icon: '🏢' },
  { id: 'slug:psychometric', name: 'Psychometric Prep', slug: 'psychometric', icon: '🎭' },
  { id: 'slug:mock-interviews', name: 'Mock Interview Prep', slug: 'mock-interviews', icon: '🎤' },
];

export function categorySlugFromValue(value: string): string {
  if (value.startsWith('slug:')) return value.slice(5);
  return value;
}

export function isResolvableCategoryValue(value: string): boolean {
  return !value.startsWith('slug:') && !value.startsWith('fallback-');
}

export const EXAM_CONTENT_TYPES: { value: ExamContentType; label: string; description: string }[] = [
  {
    value: 'mcq',
    label: 'MCQ assessment',
    description: 'Multiple-choice questions for aptitude / subject tests',
  },
  {
    value: 'programming',
    label: 'Programming exam',
    description: 'Coding-style problems (algorithms, I/O, data structures)',
  },
];

export const TOPIC_SUGGESTIONS: Record<string, string[]> = {
  quantitative: ['Percentages & ratios', 'Time and work', 'Profit and loss', 'Number series'],
  verbal: ['Reading comprehension', 'Synonyms & antonyms', 'Grammar correction', 'Para jumbles'],
  logical: ['Blood relations', 'Seating arrangement', 'Syllogisms', 'Coding-decoding'],
  coding: ['Arrays and strings', 'Recursion', 'Trees and graphs', 'Dynamic programming'],
  'current-affairs': ['National news', 'Science & technology', 'Sports', 'Government schemes'],
  'company-specific': ['TCS pattern', 'Infosys pattern', 'Aptitude mix', 'Technical fundamentals'],
  psychometric: ['Personality traits', 'Situational judgement', 'Work style', 'Team collaboration'],
  'mock-interviews': ['Tell me about yourself', 'Strengths & weaknesses', 'Conflict resolution', 'Career goals'],
  'department-exams': ['Unit test – core subject', 'Mid-semester revision', 'Placement mock'],
};

export function topicPlaceholder(slug: string | undefined, examType: ExamContentType): string {
  if (examType === 'programming') {
    return 'e.g. Two-sum, string manipulation, binary search';
  }
  const list = slug ? TOPIC_SUGGESTIONS[slug] : undefined;
  return list?.[0] ?? 'e.g. Arrays, grammar, or logical puzzles';
}

export function resolveCategorySlug(
  categories: Array<{ id: string; slug: string }>,
  categoryId: string,
): string | undefined {
  return categories.find((c) => c.id === categoryId)?.slug;
}
