import { studentAuthEmail } from '@/lib/college-auth';
import type { ExamScheduleSlotInput, ExamSlotRosterEntry } from '@/lib/exam-schedule-slots';

export const DEFAULT_EXAM_STUDENT_PASSWORD = 'Exam2026';

function csvCell(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function resolveRosterPassword(
  student: ExamSlotRosterEntry,
  defaultPassword: string = DEFAULT_EXAM_STUDENT_PASSWORD,
): string {
  return student.password?.trim() || defaultPassword.trim() || DEFAULT_EXAM_STUDENT_PASSWORD;
}

export function enrichSlotsWithPasswords(
  slots: ExamScheduleSlotInput[],
  defaultPassword: string = DEFAULT_EXAM_STUDENT_PASSWORD,
): ExamScheduleSlotInput[] {
  const fallback = defaultPassword.trim() || DEFAULT_EXAM_STUDENT_PASSWORD;
  return slots.map((slot) => ({
    ...slot,
    roster: slot.roster.map((student) => ({
      ...student,
      password: resolveRosterPassword(student, fallback),
    })),
  }));
}

export function formatRosterCredentialsCsv(
  slots: ExamScheduleSlotInput[],
  defaultPassword: string = DEFAULT_EXAM_STUDENT_PASSWORD,
): string {
  const fallback = defaultPassword.trim() || DEFAULT_EXAM_STUDENT_PASSWORD;
  const lines = ['roll,email,password,name,department,year,slot'];

  for (const slot of slots) {
    for (const student of slot.roster) {
      const row = [
        student.roll_number,
        student.email?.trim() || studentAuthEmail(student.roll_number),
        resolveRosterPassword(student, fallback),
        student.student_name ?? '',
        student.branch ?? '',
        student.academic_year ?? '',
        String(slot.slot_number),
      ];
      lines.push(row.map((value) => csvCell(value)).join(','));
    }
  }

  return lines.join('\n');
}

export function countRosterStudents(slots: ExamScheduleSlotInput[]): number {
  return slots.reduce((sum, slot) => sum + slot.roster.length, 0);
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'text/csv;charset=utf-8;',
): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadRosterCredentialsCsv(
  slots: ExamScheduleSlotInput[],
  filename: string,
  defaultPassword: string = DEFAULT_EXAM_STUDENT_PASSWORD,
): boolean {
  const enriched = enrichSlotsWithPasswords(slots, defaultPassword);
  if (countRosterStudents(enriched) === 0) return false;
  downloadTextFile(filename, formatRosterCredentialsCsv(enriched, defaultPassword));
  return true;
}
