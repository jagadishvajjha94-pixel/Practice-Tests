import type { Question } from '@/lib/types';
import {
  generateAptitudeQuestions,
  generateLogicalQuestions,
} from '@/lib/competitive-exam/generators';
import { remixMcqOptions } from '@/lib/competitive-exam/question-factory';
import { forkRng, shuffleInPlace } from '@/lib/competitive-exam/seed-rng';
import {
  PSYCHOMETRIC_POOL_SIZE,
  hashStringToSeed,
  psychometricQuestionFromIndex,
  sampleUniqueIndices,
} from '@/lib/psychometric-question-gen';
import { findDepartment, getPlacementSection } from '@/lib/placement/config';
import { placementPsychometricBank } from '@/lib/placement/psychometric-bank';
import { technicalBankForDepartment } from '@/lib/placement/technical-banks';
import type { PlacementSectionId } from '@/lib/placement/types';

function takeN<T>(arr: T[], n: number, rng: () => number): T[] {
  const copy = [...arr];
  shuffleInPlace(copy, rng);
  return copy.slice(0, Math.min(n, copy.length));
}

function buildTechnical(seed: string, departmentId: string, count: number): Question[] {
  const dept = findDepartment(departmentId) ?? findDepartment('cse')!;
  const pool = technicalBankForDepartment(dept);
  const rng = forkRng(seed, 'tech-pick');
  const picked = takeN(pool, count, rng);

  for (let i = 0; i < picked.length; i++) {
    picked[i] = remixMcqOptions(picked[i], forkRng(seed, `tech-remix-${i}`));
    picked[i] = { ...picked[i], id: `placement-tech-${i + 1}` };
  }
  return picked;
}

function buildPsychometric(seed: string, count: number): Question[] {
  const pool = placementPsychometricBank();
  const rng = forkRng(seed, 'psy-pick');
  const picked = takeN(pool, count, rng);

  for (let i = 0; i < picked.length; i++) {
    picked[i] = remixMcqOptions(picked[i], forkRng(seed, `psy-remix-${i}`));
    picked[i] = { ...picked[i], id: `placement-psy-${i + 1}` };
  }
  return picked;
}

function buildAptitude(seed: string, count: number): Question[] {
  const rng = forkRng(seed, 'apt-gen');
  const list = generateAptitudeQuestions(rng, count, `placement-apt-${seed.slice(0, 6)}`);
  list.forEach((q, i) => {
    q.id = `placement-apt-${i + 1}`;
    q.category_id = 'placement-aptitude';
  });
  return list;
}

function buildLogic(seed: string, count: number): Question[] {
  const rng = forkRng(seed, 'logic-gen');
  const list = generateLogicalQuestions(rng, count, `placement-logic-${seed.slice(0, 6)}`);
  list.forEach((q, i) => {
    q.id = `placement-logic-${i + 1}`;
    q.category_id = 'placement-logic';
  });
  return list;
}

function buildIntelligence(seed: string, count: number): Question[] {
  const base = hashStringToSeed(`placement-iq:${seed}`);
  const indices = sampleUniqueIndices(base, count, PSYCHOMETRIC_POOL_SIZE);
  return indices.map((idx, i) => {
    const q = psychometricQuestionFromIndex(idx);
    return {
      ...q,
      id: `placement-iq-${i + 1}`,
      category_id: 'placement-intelligence',
      tags: ['placement', 'iq', ...(q.tags ?? [])],
    } as Question;
  });
}

/** Build all MCQ pools for one placement session. Speaking section has no MCQs. */
export function buildPlacementQuestions(
  seed: string,
  departmentId: string,
): Record<Exclude<PlacementSectionId, 'speaking'>, Question[]> {
  return {
    technical: buildTechnical(seed, departmentId, getPlacementSection('technical').questionCount ?? 25),
    psychometric: buildPsychometric(seed, getPlacementSection('psychometric').questionCount ?? 10),
    aptitude: buildAptitude(seed, getPlacementSection('aptitude').questionCount ?? 15),
    logic: buildLogic(seed, getPlacementSection('logic').questionCount ?? 12),
    intelligence: buildIntelligence(seed, getPlacementSection('intelligence').questionCount ?? 10),
  };
}
