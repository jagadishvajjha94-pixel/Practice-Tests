import { describe, expect, it } from 'vitest';
import {
  EXAM_SLOT_CAPACITY_DEFAULT,
  EXAM_SLOT_COUNT,
  type ExamScheduleSlotInput,
  combineDateAndTime,
  normalizeRoll,
  parseRosterCsv,
  parseScheduleSlotsJson,
  validateScheduleSlots,
} from '@/lib/exam-schedule-slots';

function makeValidSlots(): ExamScheduleSlotInput[] {
  return Array.from({ length: EXAM_SLOT_COUNT }, (_, i) => ({
    slot_number: i + 1,
    exam_date: '2026-06-15',
    start_time: '09:00',
    end_time: '11:00',
    roster: [{ roll_number: `RCE${String(i + 1).padStart(3, '0')}` }],
  }));
}

describe('normalizeRoll', () => {
  it('trims, uppercases, and removes spaces', () => {
    expect(normalizeRoll('  rce 001  ')).toBe('RCE001');
  });
});

describe('combineDateAndTime', () => {
  it('builds a valid ISO timestamp from date and HH:mm', () => {
    const iso = combineDateAndTime('2026-06-15', '09:30');
    expect(iso).toBeTruthy();
    expect(new Date(iso).getTime()).not.toBeNaN();
  });

  it('returns empty string for invalid input', () => {
    expect(combineDateAndTime('', '09:00')).toBe('');
    expect(combineDateAndTime('2026-06-15', '')).toBe('');
  });
});

describe('parseRosterCsv', () => {
  it('parses headered CSV', () => {
    const rows = parseRosterCsv(
      'roll_number,name,email\nRCE001,Alice,alice@test.com\nRCE002,Bob,',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      roll_number: 'RCE001',
      student_name: 'Alice',
      email: 'alice@test.com',
    });
  });

  it('parses headerless lines and deduplicates rolls', () => {
    const rows = parseRosterCsv('RCE001\nRCE001\nRCE002');
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.roll_number)).toEqual(['RCE001', 'RCE002']);
  });
});

describe('parseScheduleSlotsJson', () => {
  it('normalizes roster rolls and sorts by slot number', () => {
    const slots = parseScheduleSlotsJson([
      { slot_number: 2, exam_date: '2026-06-01', start_time: '10:00', end_time: '12:00', roster: [{ roll_number: 'b1' }] },
      { slot_number: 1, exam_date: '2026-06-01', start_time: '08:00', end_time: '10:00', roster: [{ roll_number: ' a1 ' }] },
    ]);
    expect(slots.map((s) => s.slot_number)).toEqual([1, 2]);
    expect(slots[0].roster[0].roll_number).toBe('A1');
  });
});

describe('validateScheduleSlots', () => {
  it('accepts eight complete slots', () => {
    expect(validateScheduleSlots(makeValidSlots())).toBeNull();
  });

  it('rejects wrong slot count', () => {
    const slots = makeValidSlots().slice(0, 7);
    expect(validateScheduleSlots(slots)).toMatch(/all 8 slots/i);
  });

  it('rejects end time before start time', () => {
    const slots = makeValidSlots();
    slots[0] = { ...slots[0], start_time: '14:00', end_time: '10:00' };
    expect(validateScheduleSlots(slots)).toMatch(/end time must be after/i);
  });

  it(`rejects more than ${EXAM_SLOT_CAPACITY_DEFAULT} students per slot`, () => {
    const slots = makeValidSlots();
    slots[0] = {
      ...slots[0],
      roster: Array.from({ length: EXAM_SLOT_CAPACITY_DEFAULT + 1 }, (_, i) => ({
        roll_number: `OVER${i}`,
      })),
    };
    expect(validateScheduleSlots(slots)).toMatch(/maximum 130/i);
  });
});
