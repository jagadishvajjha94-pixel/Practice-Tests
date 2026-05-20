/** Sub-assessments merged under Evalora (not shown on /tests hub). */
export type EvaloraModuleKey =
  | 'placement_full'
  | 'psychometric'
  | 'swarx'
  | 'competitive'
  | 'programming'
  | 'department'
  | 'rmset';

export type EvaloraModuleDef = {
  key: EvaloraModuleKey;
  name: string;
  description: string;
  icon: string;
  href: string;
  badge?: string;
  features: string[];
};

export const EVALORA_MODULES: EvaloraModuleDef[] = [
  {
    key: 'placement_full',
    name: 'Evalora Full Assessment',
    description:
      'Six-section AI-graded placement paper — technical, speaking, psychometric, aptitude, logic, and IQ.',
    icon: '✨',
    href: '/placement/assessment',
    badge: '6 sections · 100 marks · 60 min',
    features: ['Technical 35', 'Speaking 10', 'Psychometric 10', 'Aptitude 20', 'Logic 15', 'IQ 10'],
  },
  {
    key: 'psychometric',
    name: 'Psychometric Paper',
    description: '200 visual and pattern MCQs in 30 minutes — unique draw per session.',
    icon: '🧠',
    href: '/tests/psychometric',
    badge: '200 Q · 30 min',
    features: ['Pattern recognition', 'Visual reasoning', 'Speed drills'],
  },
  {
    key: 'swarx',
    name: 'SWARX Communication',
    description: 'Grammar, vocal practice, and situation-based English inside one portal.',
    icon: '🗣️',
    href: '/tests/swarx',
    features: ['Vocal practice', 'Grammar test', 'Scenario English'],
  },
  {
    key: 'competitive',
    name: 'All India Competitive Paper',
    description: '60 MCQs across maths, science, aptitude, reasoning, English, and computers.',
    icon: '📝',
    href: '/tests/competitive-exam',
    badge: '60 Q · 90 min',
    features: ['Stratified paper', 'Minimal repetition', 'All subjects'],
  },
  {
    key: 'programming',
    name: 'Programming Assessment',
    description: 'Timed coding test with Monaco editor — run and submit in 7 languages.',
    icon: '💻',
    href: '/tests/programming',
    badge: '60 min',
    features: ['Python', 'Java', 'C/C++', 'JavaScript', 'Go', 'C#'],
  },
  {
    key: 'department',
    name: 'Department Exams',
    description: 'Faculty-approved MCQ exams for your branch and year when the cell goes live.',
    icon: '🏫',
    href: '/tests/department',
    badge: 'Faculty · Proctored',
    features: ['Branch matched', 'Year matched', 'Admin approved'],
  },
  {
    key: 'rmset',
    name: 'RMSET',
    description:
      'Ramachandra Multi-Section Eligibility Test — MCQs from admin-selected topics only.',
    icon: '📋',
    href: '/tests/rmset',
    badge: 'Topic-selected',
    features: ['Admin topics', 'Bank MCQs', 'Timed paper', 'Per-topic draw'],
  },
];

export function getEvaloraModule(key: string): EvaloraModuleDef | undefined {
  return EVALORA_MODULES.find((m) => m.key === key);
}
