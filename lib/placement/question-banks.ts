import type { Question } from '@/lib/types';
import { generateAptitudeQuestions } from '@/lib/competitive-exam/generators';
import { remixMcqOptions } from '@/lib/competitive-exam/question-factory';
import { forkRng, shuffleInPlace } from '@/lib/competitive-exam/seed-rng';
import { findDepartment, getPlacementSection } from '@/lib/placement/config';
import { placementIntelligenceBank } from '@/lib/placement/intelligence-bank';
import { placementLogicBank } from '@/lib/placement/logic-bank';
import {
  generateIntelligenceQuestions,
  generatePlacementLogicQuestions,
  generatePsychometricQuestions,
  generateTechnicalQuestions,
} from '@/lib/placement/placement-generators';
import { placementPsychometricBank } from '@/lib/placement/psychometric-bank';
import { technicalBankForDepartment } from '@/lib/placement/technical-banks';
import type { PlacementSectionId } from '@/lib/placement/types';

/** Pool size multiplier — generates many unique stems per student seed (supports 1000+ writers). */
const GENERATED_POOL_MULTIPLIER = 12;

function takeN<T>(arr: T[], n: number, rng: () => number): T[] {
  const copy = [...arr];
  shuffleInPlace(copy, rng);
  return copy.slice(0, Math.min(n, copy.length));
}

function buildTechnical(seed: string, departmentId: string, count: number): Question[] {
  const dept = findDepartment(departmentId) ?? findDepartment('cse')!;
  const curated = technicalBankForDepartment(dept);
  const genRng = forkRng(seed, 'tech-gen');
  const generated = generateTechnicalQuestions(
    dept.technicalCategory,
    genRng,
    count * GENERATED_POOL_MULTIPLIER,
    `placement-tech-${seed.slice(0, 8)}`,
  );
  const pool = [...curated, ...generated];
  const rng = forkRng(seed, 'tech-pick');
  const picked = takeN(pool, count, rng);

  for (let i = 0; i < picked.length; i++) {
    picked[i] = remixMcqOptions(picked[i], forkRng(seed, `tech-remix-${i}`));
    picked[i] = { ...picked[i], id: `placement-tech-${i + 1}` };
  }
  return picked;
}

function buildPsychometric(seed: string, count: number): Question[] {
  const curated = placementPsychometricBank();
  const genRng = forkRng(seed, 'psy-gen');
  const generated = generatePsychometricQuestions(
    genRng,
    count * GENERATED_POOL_MULTIPLIER,
    `placement-psy-${seed.slice(0, 8)}`,
  );
  const pool = [...curated, ...generated];
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
  const curated = placementLogicBank();
  const genRng = forkRng(seed, 'logic-gen');
  const generated = generatePlacementLogicQuestions(
    genRng,
    count * GENERATED_POOL_MULTIPLIER,
    `placement-logic-${seed.slice(0, 8)}`,
  );
  const pool = [...curated, ...generated];
  const rng = forkRng(seed, 'logic-pick');
  const picked = takeN(pool, count, rng);
  for (let i = 0; i < picked.length; i++) {
    picked[i] = remixMcqOptions(picked[i], forkRng(seed, `logic-remix-${i}`));
    picked[i] = { ...picked[i], id: `placement-logic-${i + 1}` };
  }
  return picked;
}

function buildIntelligence(seed: string, count: number): Question[] {
  const curated = placementIntelligenceBank();
  const genRng = forkRng(seed, 'iq-gen');
  const generated = generateIntelligenceQuestions(
    genRng,
    count * GENERATED_POOL_MULTIPLIER,
    `placement-iq-${seed.slice(0, 8)}`,
  );
  const pool = [...curated, ...generated];
  const rng = forkRng(seed, 'iq-pick');
  const picked = takeN(pool, count, rng);
  for (let i = 0; i < picked.length; i++) {
    picked[i] = remixMcqOptions(picked[i], forkRng(seed, `iq-remix-${i}`));
    picked[i] = { ...picked[i], id: `placement-iq-${i + 1}` };
  }
  return picked;
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
