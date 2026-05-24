import { describe, expect, it } from 'vitest';
import {
  combineDateAndTimeIst,
  formatCollegeDateTime,
  isoToDatetimeLocalInput,
  parseDatetimeLocalAsIst,
} from '@/lib/college-timezone';

describe('combineDateAndTimeIst', () => {
  it('converts 09:30 IST to UTC', () => {
    expect(combineDateAndTimeIst('2026-06-15', '09:30')).toBe('2026-06-15T04:00:00.000Z');
  });
});

describe('parseDatetimeLocalAsIst', () => {
  it('parses datetime-local as IST wall time', () => {
    expect(parseDatetimeLocalAsIst('2026-06-15T09:00')).toBe('2026-06-15T03:30:00.000Z');
  });
});

describe('isoToDatetimeLocalInput', () => {
  it('round-trips with parseDatetimeLocalAsIst', () => {
    const iso = '2026-06-15T03:30:00.000Z';
    expect(isoToDatetimeLocalInput(iso)).toBe('2026-06-15T09:00');
    expect(parseDatetimeLocalAsIst(isoToDatetimeLocalInput(iso))).toBe(iso);
  });
});

describe('formatCollegeDateTime', () => {
  it('formats UTC instant in IST', () => {
    const label = formatCollegeDateTime('2026-06-15T03:30:00.000Z');
    expect(label).toMatch(/9:00/);
    expect(label).toMatch(/IST/);
  });
});
