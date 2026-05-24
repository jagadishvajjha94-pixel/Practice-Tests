import { describe, expect, it } from 'vitest';
import type { ExamScheduleSlotInput } from '@/lib/exam-schedule-slots';
import {
  DEFAULT_EXAM_STUDENT_PASSWORD,
  enrichSlotsWithPasswords,
  formatRosterCredentialsCsv,
  resolveRosterPassword,
} from '@/lib/roster-credentials-export';

const sampleSlots: ExamScheduleSlotInput[] = [
  {
    slot_number: 1,
    exam_date: '2026-06-01',
    start_time: '09:00',
    end_time: '11:00',
    roster: [
      { roll_number: 'RCE001', student_name: 'Alice', branch: 'CSE', academic_year: '3' },
      { roll_number: 'RCE002', password: 'Custom1', branch: 'ECE', academic_year: '2' },
    ],
  },
];

describe('resolveRosterPassword', () => {
  it('uses student password or default fallback', () => {
    expect(resolveRosterPassword({ roll_number: 'RCE001' })).toBe(DEFAULT_EXAM_STUDENT_PASSWORD);
    expect(resolveRosterPassword({ roll_number: 'RCE002', password: 'Secret' })).toBe('Secret');
  });
});

describe('enrichSlotsWithPasswords', () => {
  it('fills missing passwords on roster rows', () => {
    const enriched = enrichSlotsWithPasswords(sampleSlots, 'Batch2026');
    expect(enriched[0]?.roster[0]?.password).toBe('Batch2026');
    expect(enriched[0]?.roster[1]?.password).toBe('Custom1');
  });
});

describe('formatRosterCredentialsCsv', () => {
  it('exports roll, email, password, and slot columns', () => {
    const csv = formatRosterCredentialsCsv(enrichSlotsWithPasswords(sampleSlots, 'Batch2026'));
    expect(csv.split('\n')[0]).toBe('roll,email,password,name,department,year,slot');
    expect(csv).toContain('RCE001');
    expect(csv).toContain('Batch2026');
    expect(csv).toContain('Custom1');
    expect(csv).toContain('"1"');
  });
});
