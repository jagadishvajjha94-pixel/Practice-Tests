import { parseCsvToObjects } from '@/lib/question-bank/csv-mcq';
import { normalizeRollNumber, rosterEmailForRoll } from '@/lib/exam-roster/normalize-roll';

export type ParsedRosterRow = {
  roll_number: string;
  email: string;
  full_name: string | null;
  branch: string | null;
  academic_year: string | null;
};

function pickField(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const hit = Object.entries(row).find(
      ([h]) => h.trim().toLowerCase().replace(/\s+/g, '_') === key,
    );
    if (hit?.[1]?.trim()) return hit[1].trim();
  }
  return '';
}

export function parseRosterCsv(text: string): {
  rows: ParsedRosterRow[];
  errors: string[];
} {
  const errors: string[] = [];
  const objects = parseCsvToObjects(text);
  if (!objects.length) {
    return { rows: [], errors: ['CSV is empty or could not be parsed.'] };
  }

  const byRoll = new Map<string, ParsedRosterRow>();

  objects.forEach((row, index) => {
    const line = index + 2;
    const rollRaw = pickField(row, [
      'roll_number',
      'roll',
      'rollno',
      'roll_no',
      'registration_number',
      'reg_no',
      'htno',
      'hall_ticket',
    ]);
    const roll = normalizeRollNumber(rollRaw);
    if (!roll) {
      errors.push(`Row ${line}: missing roll number`);
      return;
    }
    if (byRoll.has(roll)) {
      errors.push(`Row ${line}: duplicate roll ${roll}`);
      return;
    }

    const fullName = pickField(row, ['full_name', 'name', 'student_name']) || null;
    const branch =
      pickField(row, ['branch', 'department', 'dept', 'program']) || null;
    const year =
      pickField(row, ['academic_year', 'year', 'class_year']) || null;

    byRoll.set(roll, {
      roll_number: roll,
      email: rosterEmailForRoll(roll),
      full_name: fullName,
      branch,
      academic_year: year,
    });
  });

  return { rows: Array.from(byRoll.values()), errors };
}
