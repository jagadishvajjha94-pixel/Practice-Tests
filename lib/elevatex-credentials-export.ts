import fs from 'node:fs';
import path from 'node:path';
import {
  ELEVATEX_SAMPLE_PASSWORD,
  ELEVATEX_SAMPLE_STUDENTS,
  type ElevateXSampleStudent,
} from '@/lib/elevatex-sample-credentials';
import { studentAuthEmail } from '@/lib/college-auth';

export function formatElevateXCredentialsCsv(
  students: ElevateXSampleStudent[] = ELEVATEX_SAMPLE_STUDENTS,
  password: string = ELEVATEX_SAMPLE_PASSWORD,
): string {
  const lines = ['roll,email,password,department,year'];
  for (const s of students) {
    const email = studentAuthEmail(s.roll);
    const row = [s.roll, email, password, s.department, s.year]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',');
    lines.push(row);
  }
  return lines.join('\n');
}

/** Write CSV to public/ so deployed app can link /elevatex-slot1-credentials.csv */
export function writeElevateXCredentialsPublicCsv(
  rootDir: string,
  password: string = ELEVATEX_SAMPLE_PASSWORD,
): string {
  const outPath = path.join(rootDir, 'public', 'elevatex-slot1-credentials.csv');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, formatElevateXCredentialsCsv(ELEVATEX_SAMPLE_STUDENTS, password), 'utf8');
  return outPath;
}
