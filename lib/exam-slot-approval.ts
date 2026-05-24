import type { SupabaseClient } from '@supabase/supabase-js';
import {
  EXAM_SLOT_COUNT,
  type ExamScheduleSlotInput,
  enrichScheduleSlots,
  parseScheduleSlotsJson,
  validateSingleScheduleSlot,
} from '@/lib/exam-schedule-slots';

export type SlotApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export type ExamScheduleSlotWithApproval = ExamScheduleSlotInput & {
  approval_status?: SlotApprovalStatus;
  submitted_at?: string | null;
  approved_at?: string | null;
};

export function emptySlotDrafts(): ExamScheduleSlotWithApproval[] {
  return Array.from({ length: EXAM_SLOT_COUNT }, (_, i) => ({
    slot_number: i + 1,
    exam_date: '',
    start_time: '09:00',
    end_time: '11:00',
    capacity: 130,
    roster: [],
    approval_status: 'draft',
    submitted_at: null,
    approved_at: null,
  }));
}

export function parseSlotsWithApproval(raw: unknown): ExamScheduleSlotWithApproval[] {
  if (!Array.isArray(raw)) return emptySlotDrafts();
  const parsed = parseScheduleSlotsJson(raw) as ExamScheduleSlotWithApproval[];
  const byNum = new Map(parsed.map((s) => [s.slot_number, s]));
  return emptySlotDrafts().map((draft) => {
    const row = byNum.get(draft.slot_number);
    if (!row) return draft;
    const status = String(row.approval_status ?? 'draft') as SlotApprovalStatus;
    return {
      ...draft,
      ...row,
      approval_status: ['draft', 'pending', 'approved', 'rejected'].includes(status)
        ? status
        : 'draft',
      submitted_at: row.submitted_at ?? null,
      approved_at: row.approved_at ?? null,
    };
  });
}

export function mergeSlotList(
  current: ExamScheduleSlotWithApproval[],
  updates: ExamScheduleSlotInput[],
): ExamScheduleSlotWithApproval[] {
  const byNum = new Map(updates.map((s) => [s.slot_number, s]));
  return current.map((slot) => {
    const patch = byNum.get(slot.slot_number);
    if (!patch) return slot;
    if (slot.approval_status === 'pending' || slot.approval_status === 'approved') {
      return slot;
    }
    return {
      ...slot,
      ...patch,
      approval_status: slot.approval_status ?? 'draft',
      submitted_at: slot.submitted_at ?? null,
      approved_at: slot.approved_at ?? null,
    };
  });
}

export function canSubmitSlotNumber(
  slots: ExamScheduleSlotWithApproval[],
  slotNumber: number,
): { ok: true } | { ok: false; reason: string } {
  const slot = slots.find((s) => s.slot_number === slotNumber);
  if (!slot) return { ok: false, reason: `Slot ${slotNumber} not found.` };

  if (slot.approval_status === 'pending') {
    return { ok: false, reason: `Slot ${slotNumber} is already waiting for admin approval.` };
  }
  if (slot.approval_status === 'approved') {
    return { ok: false, reason: `Slot ${slotNumber} is already approved.` };
  }

  if (slotNumber > 1) {
    const prev = slots.find((s) => s.slot_number === slotNumber - 1);
    if (!prev || prev.approval_status !== 'approved') {
      return {
        ok: false,
        reason: `Submit and get Slot ${slotNumber - 1} approved before Slot ${slotNumber}.`,
      };
    }
  }

  const validationError = validateSingleScheduleSlot(slot);
  if (validationError) {
    return { ok: false, reason: validationError };
  }

  return { ok: true };
}

export function markSlotPending(
  slots: ExamScheduleSlotWithApproval[],
  slotNumber: number,
): ExamScheduleSlotWithApproval[] {
  const now = new Date().toISOString();
  return slots.map((slot) =>
    slot.slot_number === slotNumber
      ? { ...slot, approval_status: 'pending' as const, submitted_at: now }
      : slot,
  );
}

export function markSlotApproved(
  slots: ExamScheduleSlotWithApproval[],
  slotNumber: number,
): ExamScheduleSlotWithApproval[] {
  const now = new Date().toISOString();
  return slots.map((slot) =>
    slot.slot_number === slotNumber
      ? { ...slot, approval_status: 'approved' as const, approved_at: now }
      : slot,
  );
}

export function countSlotsByStatus(
  slots: ExamScheduleSlotWithApproval[],
  status: SlotApprovalStatus,
): number {
  return slots.filter((s) => s.approval_status === status).length;
}

export function allSlotsApproved(slots: ExamScheduleSlotWithApproval[]): boolean {
  return countSlotsByStatus(slots, 'approved') === EXAM_SLOT_COUNT;
}

export function hasPendingSlot(slots: ExamScheduleSlotWithApproval[]): boolean {
  return slots.some((s) => s.approval_status === 'pending');
}

export function nextSubmittableSlot(
  slots: ExamScheduleSlotWithApproval[],
): number | null {
  for (let n = 1; n <= EXAM_SLOT_COUNT; n++) {
    const slot = slots.find((s) => s.slot_number === n);
    if (!slot) continue;
    if (slot.approval_status === 'approved') continue;
    if (slot.approval_status === 'pending') return null;
    return n;
  }
  return null;
}

export async function saveRequestSlotJson(
  admin: SupabaseClient,
  requestId: string,
  slots: ExamScheduleSlotWithApproval[],
): Promise<void> {
  const { error } = await admin
    .from('faculty_exam_requests')
    .update({
      schedule_slots_json: slots,
      uses_slot_scheduling: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) throw new Error(error.message);
}

export function slotForApproval(
  slots: ExamScheduleSlotWithApproval[],
  slotNumber: number,
): ExamScheduleSlotInput | null {
  const slot = slots.find((s) => s.slot_number === slotNumber);
  if (!slot || slot.approval_status !== 'pending') return null;
  return slot;
}

export function pendingSlotNumbers(slots: ExamScheduleSlotWithApproval[]): number[] {
  return slots.filter((s) => s.approval_status === 'pending').map((s) => s.slot_number);
}

export function slotStatusLabel(status: SlotApprovalStatus | undefined): string {
  switch (status) {
    case 'pending':
      return 'Awaiting approval';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Draft';
  }
}

/** Strip approval metadata for schedule creation. */
export function slotsForScheduleCreate(
  slots: ExamScheduleSlotWithApproval[],
  slotNumbers: number[],
): ReturnType<typeof enrichScheduleSlots> {
  const picked = slots.filter((s) => slotNumbers.includes(s.slot_number));
  return enrichScheduleSlots(picked);
}
