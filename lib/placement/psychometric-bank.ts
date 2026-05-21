import type { Question } from '@/lib/types';
import { makeMcq } from '@/lib/competitive-exam/question-factory';

type Item = {
  q: string;
  options: [string, string, string, string];
  /** Best answer letter (placement psychometric items have a "preferred" workplace answer). */
  correct: 'A' | 'B' | 'C' | 'D';
  trait:
    | 'leadership'
    | 'teamwork'
    | 'eq'
    | 'decision'
    | 'attitude'
    | 'stress';
};

const ITEMS: Item[] = [
  {
    q: 'Your team is two days from a deadline and a critical bug appears. You:',
    options: [
      'Wait for the manager to assign someone',
      'Block off time, lead a short triage, and own the fix or delegation',
      'Hope the QA team catches it',
      'Push the deadline without discussion',
    ],
    correct: 'B',
    trait: 'leadership',
  },
  {
    q: 'A teammate constantly takes credit for shared work. The most effective response is to:',
    options: [
      'Confront them publicly in the next meeting',
      'Speak to them privately and document contributions transparently',
      'Stop collaborating with them',
      'Match their behaviour',
    ],
    correct: 'B',
    trait: 'teamwork',
  },
  {
    q: 'During code review, a senior engineer firmly disagrees with your approach. You:',
    options: [
      'Insist on your version because you wrote it',
      'Listen to their reasoning, share your trade-offs, and converge on the better design',
      'Silently revert your change',
      'Escalate to the manager',
    ],
    correct: 'B',
    trait: 'eq',
  },
  {
    q: 'You must choose between two correct designs: one is faster, the other is far easier to maintain. You:',
    options: [
      'Always pick the faster one',
      'Always pick the simpler one',
      'Weigh expected scale, team size, and timeline, and document the decision',
      'Flip a coin',
    ],
    correct: 'C',
    trait: 'decision',
  },
  {
    q: 'A junior teammate is struggling but afraid to ask for help. The best move is to:',
    options: [
      'Wait until they fail and learn',
      'Offer a recurring 15-minute check-in and make it safe to ask questions',
      'Take over their work entirely',
      'Report them to the manager',
    ],
    correct: 'B',
    trait: 'teamwork',
  },
  {
    q: 'You receive harsh feedback on a deliverable. You should:',
    options: [
      'Defend every point immediately',
      'Acknowledge it, ask for specifics, and act on what is valid',
      'Quit the project',
      'Ignore the feedback',
    ],
    correct: 'B',
    trait: 'eq',
  },
  {
    q: 'The system is down at 11 PM. You:',
    options: [
      'Panic and post in every channel',
      'Open a calm incident channel, scope the impact, and follow the runbook',
      'Wait for someone else to lead',
      'Push a quick untested fix',
    ],
    correct: 'B',
    trait: 'stress',
  },
  {
    q: 'You disagree with a company policy you think is wrong. You:',
    options: [
      'Quietly comply forever',
      'Voice the concern through the right channel and propose an alternative',
      'Vent on social media',
      'Ignore it and switch jobs immediately',
    ],
    correct: 'B',
    trait: 'attitude',
  },
  {
    q: 'You finish a task before everyone else and the team is still busy. You:',
    options: [
      'Take a long break',
      'Offer to help unblock teammates or pick up a low-priority task',
      'Start a new feature alone',
      'Watch videos until others finish',
    ],
    correct: 'B',
    trait: 'teamwork',
  },
  {
    q: 'You spot a small ethical issue in a workflow. You should:',
    options: [
      'Stay quiet — it is small',
      'Raise it openly with the right stakeholder',
      'Anonymously change the workflow',
      'Quit immediately',
    ],
    correct: 'B',
    trait: 'attitude',
  },
  {
    q: 'You have three high-priority requests at once. The best approach is to:',
    options: [
      'Work on whichever feels easiest',
      'Negotiate priorities and sequence with the requesters, document trade-offs',
      'Try to do all three in parallel and miss all of them',
      'Pick the one from the loudest person',
    ],
    correct: 'B',
    trait: 'decision',
  },
  {
    q: 'A teammate seems anxious about an upcoming release. You:',
    options: [
      'Tell them to be tougher',
      'Listen briefly, share what you observe is going well, and offer concrete help',
      'Ignore it',
      'Tell the manager',
    ],
    correct: 'B',
    trait: 'eq',
  },
  {
    q: 'You realise you made a mistake that broke production. You:',
    options: [
      'Hide the error until someone else finds it',
      'Own it immediately, mitigate, then write a calm post-mortem',
      'Blame the deploy tool',
      'Take a day off',
    ],
    correct: 'B',
    trait: 'attitude',
  },
  {
    q: 'In a stand-up, your update should typically focus on:',
    options: [
      'A detailed code walkthrough',
      'Progress, blockers, and what you need next — concise',
      'Your weekend plans',
      'Other people\'s tasks',
    ],
    correct: 'B',
    trait: 'leadership',
  },
  {
    q: 'You have to give difficult feedback to a peer. You should:',
    options: [
      'Send a long email out of the blue',
      'Have a private conversation, be specific, focus on behaviour and impact, not character',
      'Tell their manager first',
      'Avoid it indefinitely',
    ],
    correct: 'B',
    trait: 'eq',
  },
  {
    q: 'When priorities conflict between two managers, you should:',
    options: [
      'Ignore both until they forget',
      'Clarify deadlines with both, escalate only if blocked, and document agreed priorities',
      'Work only on the louder manager\'s task',
      'Quit the task',
    ],
    correct: 'B',
    trait: 'decision',
  },
  {
    q: 'After a failed sprint demo, the best team response is to:',
    options: [
      'Blame the tester',
      'Run a short retrospective, agree on one improvement, and retry with a smaller scope',
      'Cancel agile ceremonies',
      'Ship anyway without telling stakeholders',
    ],
    correct: 'B',
    trait: 'teamwork',
  },
];

export function placementPsychometricBank(): Question[] {
  return ITEMS.map((it, idx) =>
    makeMcq({
      id: `placement-psy-${idx + 1}`,
      topicSlug: `placement-psychometric-${it.trait}`,
      difficulty: 'medium',
      question_text: it.q,
      options: it.options,
      correctLetter: it.correct,
    }),
  );
}
