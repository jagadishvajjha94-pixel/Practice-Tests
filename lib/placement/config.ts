import type {
  PlacementDepartment,
  PlacementSectionConfig,
  PlacementSectionId,
  SpeakingTask,
} from '@/lib/placement/types';

export const PLACEMENT_EXAM_NAME = 'Evalora';
export const PLACEMENT_EXAM_TAGLINE = 'AI-graded campus placement assessment';
export const PLACEMENT_TOTAL_MARKS = 100;
export const PLACEMENT_TOTAL_SEC = 60 * 60; // 1 hour

export const PLACEMENT_SECTIONS: PlacementSectionConfig[] = [
  {
    id: 'technical',
    name: 'Technical Assessment',
    short: 'Technical',
    description:
      'Department-aligned MCQs covering subject fundamentals, scenarios, and real-world applications.',
    icon: '🛠️',
    kind: 'mcq',
    marks: 35,
    durationSec: 20 * 60,
    questionCount: 25,
    negativeMarking: 0.25,
  },
  {
    id: 'speaking',
    name: 'Speaking Skills',
    short: 'Speaking',
    description:
      'Self-introduction, paragraph reading, and a confidence question. AI evaluates fluency, clarity, and grammar.',
    icon: '🎙️',
    kind: 'speaking',
    marks: 10,
    durationSec: 5 * 60,
  },
  {
    id: 'psychometric',
    name: 'Psychometric Assessment',
    short: 'Psychometric',
    description:
      'Personality and behavioural items covering leadership, teamwork, EQ, decision making, and stress handling.',
    icon: '🧠',
    kind: 'mcq',
    marks: 10,
    durationSec: 5 * 60,
    questionCount: 10,
    negativeMarking: 0,
  },
  {
    id: 'aptitude',
    name: 'Aptitude Assessment',
    short: 'Aptitude',
    description:
      'Quantitative aptitude — percentage, profit & loss, time & work, probability, number systems, speed & distance.',
    icon: '📐',
    kind: 'mcq',
    marks: 20,
    durationSec: 12 * 60,
    questionCount: 15,
    negativeMarking: 0.25,
  },
  {
    id: 'logic',
    name: 'Logic Building',
    short: 'Logic',
    description:
      'Logical reasoning, pattern recognition, critical thinking, analytical reasoning, and puzzles.',
    icon: '🧩',
    kind: 'mcq',
    marks: 15,
    durationSec: 10 * 60,
    questionCount: 12,
    negativeMarking: 0.25,
  },
  {
    id: 'intelligence',
    name: 'Intelligence',
    short: 'IQ',
    description:
      'IQ-style observation, memory, sequence, and visual reasoning items.',
    icon: '🔮',
    kind: 'mcq',
    marks: 10,
    durationSec: 8 * 60,
    questionCount: 10,
    negativeMarking: 0,
  },
];

export function getPlacementSection(id: PlacementSectionId): PlacementSectionConfig {
  const found = PLACEMENT_SECTIONS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown placement section: ${id}`);
  return found;
}

/** Built-in departments. Faculty / admin can extend via DB later. */
export const PLACEMENT_DEPARTMENTS: PlacementDepartment[] = [
  { id: 'cse', name: 'Computer Science & Engineering', technicalCategory: 'cse' },
  { id: 'ece', name: 'Electronics & Communication', technicalCategory: 'ece' },
  { id: 'cyber', name: 'Cyber Security', technicalCategory: 'cyber' },
  { id: 'aiml', name: 'AI / Machine Learning', technicalCategory: 'aiml' },
  { id: 'mech', name: 'Mechanical Engineering', technicalCategory: 'mechanical' },
  { id: 'civil', name: 'Civil Engineering', technicalCategory: 'civil' },
  { id: 'eee', name: 'Electrical & Electronics', technicalCategory: 'generic' },
  { id: 'it', name: 'Information Technology', technicalCategory: 'cse' },
  { id: 'biotech', name: 'Biotechnology', technicalCategory: 'generic' },
  { id: 'other', name: 'Other / Custom Department', technicalCategory: 'generic' },
];

export function findDepartment(id: string): PlacementDepartment | null {
  return PLACEMENT_DEPARTMENTS.find((d) => d.id === id) ?? null;
}

export const SPEAKING_TASKS: SpeakingTask[] = [
  {
    id: 'self-intro',
    title: 'Self introduction',
    prompt:
      'Introduce yourself in 60 seconds — name, branch, year, technical interests, one project you are proud of, and a goal for your next placement cycle.',
    recordSec: 60,
    marks: 3,
  },
  {
    id: 'paragraph',
    title: 'Read this paragraph aloud',
    prompt:
      'Speak clearly. Try to maintain a natural pace. The AI will compare the recording to the original text.',
    referenceText:
      'Effective communication is at the heart of every successful engineer. Whether you are explaining a design decision, walking a teammate through a tricky bug, or presenting a project to non-technical stakeholders, the ability to organise your thoughts and convey them with clarity is what separates great engineers from merely good ones.',
    recordSec: 90,
    marks: 4,
  },
  {
    id: 'confidence',
    title: 'Confidence question',
    prompt:
      'Tell us about a moment you struggled at work or in college and how you handled it. Speak naturally for 45 seconds.',
    recordSec: 45,
    marks: 3,
  },
];

/** Hard cap for any single section's timer (defense in depth). */
export const SECTION_TIME_HARD_CAP_SEC = 30 * 60;
