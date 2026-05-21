import type { PlacementSectionId } from '@/lib/placement/types';

/** Four sample ElevateX syllabus bundles — each emphasises four of six sections (full exam uses all six). */
export type ElevateXSampleSetId = 'set-a' | 'set-b' | 'set-c' | 'set-d';

export type ElevateXSampleSet = {
  id: ElevateXSampleSetId;
  title: string;
  /** Four primary topics in this practice bundle. */
  topics: PlacementSectionId[];
  syllabus: string[];
  mcqCount: number;
  speakingPrompts: number;
};

export const ELEVATEX_SAMPLE_SETS: ElevateXSampleSet[] = [
  {
    id: 'set-a',
    title: 'STEM Core (Set A)',
    topics: ['technical', 'aptitude', 'logic', 'intelligence'],
    syllabus: [
      'Technical: branch MCQs — data structures, OS, DBMS, networks, domain scenarios',
      'Aptitude: percentages, profit & loss, time & work, probability, number systems',
      'Logic: sequences, syllogisms, puzzles, critical reasoning',
      'Intelligence (IQ): pattern, spatial, and abstract reasoning',
    ],
    mcqCount: 70,
    speakingPrompts: 0,
  },
  {
    id: 'set-b',
    title: 'Industry Ready (Set B)',
    topics: ['technical', 'aptitude', 'psychometric', 'speaking'],
    syllabus: [
      'Technical: fundamentals + applied problem scenarios',
      'Aptitude: quantitative and data interpretation',
      'Psychometric: leadership, teamwork, EQ, decision making, stress',
      'Speaking: self-intro, reading aloud, situational and professional responses (5 prompts)',
    ],
    mcqCount: 55,
    speakingPrompts: 5,
  },
  {
    id: 'set-c',
    title: 'Reasoning & Behaviour (Set C)',
    topics: ['aptitude', 'logic', 'intelligence', 'psychometric'],
    syllabus: [
      'Aptitude: speed maths and applied word problems',
      'Logic: analytical and deductive reasoning',
      'Intelligence (IQ): observation, memory, and visual reasoning',
      'Psychometric: workplace judgement and attitude items',
    ],
    mcqCount: 65,
    speakingPrompts: 0,
  },
  {
    id: 'set-d',
    title: 'Full ElevateX Paper (Set D)',
    topics: ['technical', 'speaking', 'psychometric', 'aptitude', 'logic', 'intelligence'],
    syllabus: [
      'Technical assignment — 20 MCQs (20 marks)',
      'Speaking / communication skills — 5 recorded prompts (15 marks)',
      'Psychometric test — 15 MCQs (15 marks)',
      'Aptitude — 20 MCQs (20 marks)',
      'Logic building — 15 MCQs (15 marks)',
      'Intelligence (IQ) — 15 MCQs (15 marks)',
    ],
    mcqCount: 85,
    speakingPrompts: 5,
  },
];

/** Official live ElevateX paper — all six sections, 100 marks, 60 minutes. */
export const ELEVATEX_FULL_PAPER = ELEVATEX_SAMPLE_SETS.find((s) => s.id === 'set-d')!;
