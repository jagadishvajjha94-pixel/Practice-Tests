export type ExamBuilderTestType = {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Opens syllabus topic picker when true. */
  requiresSyllabus: boolean;
  syllabusGroup: 'aptitude' | 'logical' | 'technical' | 'verbal' | 'rmset' | null;
  defaultQuestionsPerTopic: number;
  defaultDurationMinutes: number;
};

export const EXAM_BUILDER_TEST_TYPES: ExamBuilderTestType[] = [
  {
    id: 'aptitude',
    name: 'Aptitude',
    description: 'Quantitative aptitude — pick syllabus units; questions drawn from the bank per topic.',
    icon: '📐',
    requiresSyllabus: true,
    syllabusGroup: 'aptitude',
    defaultQuestionsPerTopic: 5,
    defaultDurationMinutes: 45,
  },
  {
    id: 'logical-reasoning',
    name: 'Logical Reasoning',
    description: 'Deduction, arrangements, and data interpretation topics.',
    icon: '🧩',
    requiresSyllabus: true,
    syllabusGroup: 'logical',
    defaultQuestionsPerTopic: 5,
    defaultDurationMinutes: 40,
  },
  {
    id: 'technical',
    name: 'Technical (CSE)',
    description: 'Programming, DBMS, OS, and networks units from the question bank.',
    icon: '💻',
    requiresSyllabus: true,
    syllabusGroup: 'technical',
    defaultQuestionsPerTopic: 5,
    defaultDurationMinutes: 60,
  },
  {
    id: 'verbal',
    name: 'Verbal / English',
    description: 'Reading comprehension, vocabulary, and grammar syllabus units.',
    icon: '📖',
    requiresSyllabus: true,
    syllabusGroup: 'verbal',
    defaultQuestionsPerTopic: 5,
    defaultDurationMinutes: 30,
  },
  {
    id: 'rmset',
    name: 'RMSET',
    description: 'Multi-section eligibility paper — select syllabus topics, then draw MCQs from the question bank.',
    icon: '📋',
    requiresSyllabus: true,
    syllabusGroup: 'rmset',
    defaultQuestionsPerTopic: 10,
    defaultDurationMinutes: 60,
  },
  {
    id: 'elevatex',
    name: 'ElevateX (1 hour)',
    description:
      'Fixed 6-section talent challenge (100 marks, 60 min). Configure 8 student slots with roster, then submit for admin approval.',
    icon: '🚀',
    requiresSyllabus: false,
    syllabusGroup: null,
    defaultQuestionsPerTopic: 0,
    defaultDurationMinutes: 60,
  },
  {
    id: 'department-manual',
    name: 'Department exam (manual MCQs)',
    description: 'Upload or type your own questions — no syllabus picker.',
    icon: '🏫',
    requiresSyllabus: false,
    syllabusGroup: null,
    defaultQuestionsPerTopic: 0,
    defaultDurationMinutes: 30,
  },
];

export const EXAM_BUILDER_SLOTS = [
  { id: 'slot-1', label: 'Slot 1' },
  { id: 'slot-2', label: 'Slot 2' },
  { id: 'slot-3', label: 'Slot 3' },
  { id: 'slot-4', label: 'Slot 4' },
  { id: 'morning', label: 'Morning batch' },
  { id: 'afternoon', label: 'Afternoon batch' },
  { id: 'batch-a', label: 'Batch A' },
  { id: 'batch-b', label: 'Batch B' },
] as const;

export function getExamBuilderTestType(id: string): ExamBuilderTestType | undefined {
  return EXAM_BUILDER_TEST_TYPES.find((t) => t.id === id);
}
