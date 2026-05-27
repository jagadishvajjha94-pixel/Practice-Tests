#!/usr/bin/env node
/**
 * Seed ~150 unique MCQs per syllabus topic into Supabase.
 * Usage: node scripts/seed-question-bank.mjs [--per-topic=150] [--keep-existing]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  try {
    const raw = readFileSync(resolve(root, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* optional */
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const perTopicArg = process.argv.find((a) => a.startsWith('--per-topic='));
const questionsPerTopic = perTopicArg
  ? Math.min(200, Math.max(10, Number(perTopicArg.split('=')[1]) || 150))
  : 150;
const replaceExisting = !process.argv.includes('--keep-existing');

async function main() {
  const { seedCuratedQuestionBank } = await import('../lib/question-bank/seed-curated-bank.ts');
  const admin = createClient(url, key, { auth: { persistSession: false } });
  console.log(`Seeding ${questionsPerTopic} MCQs per topic (replace=${replaceExisting})…`);
  const result = await seedCuratedQuestionBank(admin, { questionsPerTopic, replaceExisting });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
