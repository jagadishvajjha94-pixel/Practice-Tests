import { describe, expect, it } from 'vitest';
import {
  canSubmitSlotNumber,
  emptySlotDrafts,
  markSlotApproved,
  markSlotPending,
  nextSubmittableSlot,
  pendingSlotNumbers,
} from '@/lib/exam-slot-approval';

function slotWithRoster(n: number) {
  return {
    slot_number: n,
    exam_date: '2026-06-01',
    start_time: '09:00',
    end_time: '11:00',
    capacity: 130,
    roster: [{ roll_number: `R${n}001` }],
    approval_status: 'draft' as const,
  };
}

describe('exam-slot-approval', () => {
  it('allows submitting slot 1 when valid', () => {
    const slots = emptySlotDrafts().map((s) =>
      s.slot_number === 1 ? slotWithRoster(1) : s,
    );
    expect(canSubmitSlotNumber(slots, 1)).toEqual({ ok: true });
    expect(nextSubmittableSlot(slots)).toBe(1);
  });

  it('blocks slot 2 until slot 1 is approved', () => {
    let slots = emptySlotDrafts().map((s) =>
      s.slot_number <= 2 ? slotWithRoster(s.slot_number) : s,
    );
    const blocked = canSubmitSlotNumber(slots, 2);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.reason).toContain('Slot 1');
    }

    slots = markSlotPending(slots, 1);
    expect(canSubmitSlotNumber(slots, 2).ok).toBe(false);

    slots = markSlotApproved(slots, 1);
    expect(canSubmitSlotNumber(slots, 2).ok).toBe(true);
    expect(nextSubmittableSlot(slots)).toBe(2);
  });

  it('lists pending slot numbers', () => {
    let slots = emptySlotDrafts().map((s) =>
      s.slot_number === 1 ? slotWithRoster(1) : s,
    );
    slots = markSlotPending(slots, 1);
    expect(pendingSlotNumbers(slots)).toEqual([1]);
  });
});
