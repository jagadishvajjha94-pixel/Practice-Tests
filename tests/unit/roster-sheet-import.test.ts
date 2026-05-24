import { describe, expect, it } from 'vitest';
import {
  buildSlotRosterImport,
  guessRosterColumnMapping,
  normalizeSlotNumber,
  parseCsvText,
  previewMappedRosterRows,
} from '@/lib/roster-sheet-import';

describe('guessRosterColumnMapping', () => {
  it('detects common header names', () => {
    const mapping = guessRosterColumnMapping([
      'Roll No',
      'Student Name',
      'Email ID',
      'Department',
      'Year',
      'Slot',
    ]);
    expect(mapping.roll_number).toBe('Roll No');
    expect(mapping.student_name).toBe('Student Name');
    expect(mapping.email).toBe('Email ID');
    expect(mapping.branch).toBe('Department');
    expect(mapping.academic_year).toBe('Year');
    expect(mapping.slot_number).toBe('Slot');
  });
});

describe('normalizeSlotNumber', () => {
  it('accepts plain numbers and slot labels', () => {
    expect(normalizeSlotNumber('2')).toBe(2);
    expect(normalizeSlotNumber('Slot 3')).toBe(3);
    expect(normalizeSlotNumber('slot-8')).toBe(8);
    expect(normalizeSlotNumber('9')).toBeNull();
  });
});

describe('parseCsvText + mapping', () => {
  it('maps rows using selected columns', () => {
    const sheet = parseCsvText(
      'roll,name,email,department,year,slot\nRCE001,Alice,a@test.com,CSE,3,1\nRCE002,Bob,b@test.com,ECE,2,2',
    );
    const mapping = guessRosterColumnMapping(sheet.headers);
    const preview = previewMappedRosterRows(sheet, mapping, 2);
    expect(preview[0]).toMatchObject({
      roll_number: 'RCE001',
      student_name: 'Alice',
      branch: 'CSE',
      academic_year: '3',
    });

    const bySlot = buildSlotRosterImport(sheet, mapping, {
      mode: 'slot_column',
      targetSlot: 1,
    });
    expect(bySlot.bySlot.get(1)?.length).toBe(1);
    expect(bySlot.bySlot.get(2)?.length).toBe(1);
  });

  it('assigns all rows to one selected slot', () => {
    const sheet = parseCsvText('roll,name\nRCE001,Alice\nRCE002,Bob');
    const mapping = guessRosterColumnMapping(sheet.headers);
    const result = buildSlotRosterImport(sheet, mapping, {
      mode: 'single_slot',
      targetSlot: 4,
    });
    expect(result.bySlot.get(4)?.length).toBe(2);
  });
});
