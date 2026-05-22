import type { SupabaseClient } from '@supabase/supabase-js';
import { rollNumberFromUser } from '@/lib/admin/roll-number';
import {
  isScheduleWindowOpen,
  scheduleMatchesStudent,
  type ExamScheduleRow,
} from '@/lib/exam-schedule';

export const EXAM_SLOT_COUNT = 8;
export const EXAM_SLOT_CAPACITY_DEFAULT = 130;

export type ExamSlotRosterEntry = {
  roll_number: string;
  student_name?: string;
  email?: string;
};

export type ExamScheduleSlotInput = {
  slot_number: number;
  exam_date: string;
  start_time: string;
  end_time: string;
  capacity?: number;
  roster: ExamSlotRosterEntry[];
};

export type ParsedExamScheduleSlot = ExamScheduleSlotInput & {
  starts_at: string;
  ends_at: string;
  capacity: number;
};

export function normalizeRoll(value: string): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function combineDateAndTime(dateStr: string, timeStr: string): string {
  const date = dateStr.trim();
  const time = timeStr.trim();
  if (!date || !time) return '';
  const isoLocal = `${date}T${time.length === 5 ? `${time}:00` : time}`;
  const ms = new Date(isoLocal).getTime();
  if (Number.isNaN(ms)) return '';
  return new Date(ms).toISOString();
}

export function parseScheduleSlotsJson(raw: unknown): ExamScheduleSlotInput[] {
  if (!Array.isArray(raw)) return [];
  const out: ExamScheduleSlotInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const slot_number = Number(row.slot_number);
    if (!Number.isFinite(slot_number) || slot_number < 1 || slot_number > EXAM_SLOT_COUNT) {
      continue;
    }
    const rosterRaw = Array.isArray(row.roster) ? row.roster : [];
    const roster: ExamSlotRosterEntry[] = [];
    const seen = new Set<string>();
    for (const r of rosterRaw) {
      if (!r || typeof r !== 'object') continue;
      const entry = r as Record<string, unknown>;
      const roll = normalizeRoll(String(entry.roll_number ?? ''));
      if (!roll || seen.has(roll)) continue;
      seen.add(roll);
      roster.push({
        roll_number: roll,
        student_name: entry.student_name ? String(entry.student_name).trim() : undefined,
        email: entry.email ? String(entry.email).trim() : undefined,
      });
    }
    out.push({
      slot_number: Math.floor(slot_number),
      exam_date: String(row.exam_date ?? '').trim(),
      start_time: String(row.start_time ?? '').trim(),
      end_time: String(row.end_time ?? '').trim(),
      capacity: Number(row.capacity) || EXAM_SLOT_CAPACITY_DEFAULT,
      roster,
    });
  }
  return out.sort((a, b) => a.slot_number - b.slot_number);
}

export function validateScheduleSlots(slots: ExamScheduleSlotInput[]): string | null {
  if (slots.length !== EXAM_SLOT_COUNT) {
    return `Configure all ${EXAM_SLOT_COUNT} slots (date, start time, end time, and student list).`;
  }
  const numbers = new Set<number>();
  for (const slot of slots) {
    if (numbers.has(slot.slot_number)) {
      return `Duplicate slot number ${slot.slot_number}.`;
    }
    numbers.add(slot.slot_number);
    if (!slot.exam_date) return `Slot ${slot.slot_number}: exam date is required.`;
    if (!slot.start_time || !slot.end_time) {
      return `Slot ${slot.slot_number}: start and end times are required.`;
    }
    const starts_at = combineDateAndTime(slot.exam_date, slot.start_time);
    const ends_at = combineDateAndTime(slot.exam_date, slot.end_time);
    if (!starts_at || !ends_at) {
      return `Slot ${slot.slot_number}: invalid date or time.`;
    }
    if (new Date(ends_at).getTime() <= new Date(starts_at).getTime()) {
      return `Slot ${slot.slot_number}: end time must be after start time.`;
    }
    const cap = Math.min(EXAM_SLOT_CAPACITY_DEFAULT, Math.max(1, Number(slot.capacity) || EXAM_SLOT_CAPACITY_DEFAULT));
    if (slot.roster.length === 0) {
      return `Slot ${slot.slot_number}: upload at least one student (roll number).`;
    }
    if (slot.roster.length > cap) {
      return `Slot ${slot.slot_number}: maximum ${cap} students allowed (you uploaded ${slot.roster.length}).`;
    }
  }
  for (let n = 1; n <= EXAM_SLOT_COUNT; n++) {
    if (!numbers.has(n)) return `Slot ${n} is missing.`;
  }
  return null;
}

export function enrichScheduleSlots(slots: ExamScheduleSlotInput[]): ParsedExamScheduleSlot[] {
  return slots.map((slot) => ({
    ...slot,
    starts_at: combineDateAndTime(slot.exam_date, slot.start_time),
    ends_at: combineDateAndTime(slot.exam_date, slot.end_time),
    capacity: Math.min(
      EXAM_SLOT_CAPACITY_DEFAULT,
      Math.max(1, Number(slot.capacity) || EXAM_SLOT_CAPACITY_DEFAULT),
    ),
  }));
}

export function parseRosterCsv(text: string): ExamSlotRosterEntry[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = lines[0].toLowerCase();
  const hasHeader =
    header.includes('roll') || header.includes('name') || header.includes('email');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const out: ExamSlotRosterEntry[] = [];
  const seen = new Set<string>();
  for (const line of dataLines) {
    const parts = line.split(/[,;\t]/).map((p) => p.trim());
    const roll = normalizeRoll(parts[0] ?? '');
    if (!roll || seen.has(roll)) continue;
    seen.add(roll);
    out.push({
      roll_number: roll,
      student_name: parts[1] || undefined,
      email: parts[2] || undefined,
    });
  }
  return out;
}

export async function persistSlotRoster(
  admin: SupabaseClient,
  requestId: string,
  slots: ExamScheduleSlotInput[],
): Promise<void> {
  await admin
    .from('exam_slot_roster_entries')
    .delete()
    .eq('faculty_exam_request_id', requestId);

  const rows: Array<Record<string, unknown>> = [];
  for (const slot of slots) {
    for (const student of slot.roster) {
      rows.push({
        faculty_exam_request_id: requestId,
        slot_number: slot.slot_number,
        roll_number: student.roll_number,
        student_name: student.student_name ?? null,
        email: student.email ?? null,
      });
    }
  }
  if (rows.length === 0) return;

  const { error } = await admin.from('exam_slot_roster_entries').insert(rows);
  if (error && !error.message.includes('exam_slot_roster')) {
    throw new Error(error.message);
  }
}

export async function loadSlotsForRequest(
  admin: SupabaseClient,
  requestId: string,
): Promise<{ uses_slot_scheduling: boolean; slots: ExamScheduleSlotInput[] }> {
  const { data, error } = await admin
    .from('faculty_exam_requests')
    .select('uses_slot_scheduling, schedule_slots_json')
    .eq('id', requestId)
    .maybeSingle();

  if (error || !data) {
    return { uses_slot_scheduling: false, slots: [] };
  }

  const uses = Boolean(data.uses_slot_scheduling);
  const slots = parseScheduleSlotsJson(data.schedule_slots_json);
  return { uses_slot_scheduling: uses, slots };
}

export async function findStudentSlotAssignment(
  admin: SupabaseClient,
  requestId: string,
  rollNumber: string,
): Promise<{ slot_number: number; student_name: string | null } | null> {
  const roll = normalizeRoll(rollNumber);
  if (!roll) return null;

  const { data, error } = await admin
    .from('exam_slot_roster_entries')
    .select('slot_number, student_name')
    .eq('faculty_exam_request_id', requestId)
    .eq('roll_number', roll)
    .maybeSingle();

  if (!error && data?.slot_number) {
    return {
      slot_number: Number(data.slot_number),
      student_name: (data.student_name as string | null) ?? null,
    };
  }

  const { uses_slot_scheduling, slots } = await loadSlotsForRequest(admin, requestId);
  if (!uses_slot_scheduling) return null;

  for (const slot of slots) {
    const hit = slot.roster.find((r) => normalizeRoll(r.roll_number) === roll);
    if (hit) {
      return { slot_number: slot.slot_number, student_name: hit.student_name ?? null };
    }
  }
  return null;
}

export type SlotAccessDetail = {
  assigned_slot: number | null;
  slot_label: string;
  window_label: string;
};

export async function checkStudentSlotExamAccess(
  admin: SupabaseClient,
  input: {
    schedules: ExamScheduleRow[];
    facultyExamRequestId: string;
    rollNumber: string;
    email?: string | null;
    metadata?: Record<string, unknown> | null;
    department: string;
    year: string;
    now?: number;
  },
): Promise<
  | { allowed: true; schedule: ExamScheduleRow; detail?: SlotAccessDetail }
  | {
      allowed: false;
      code: 'SLOT_NOT_ASSIGNED' | 'SLOT_WRONG_WINDOW' | 'NOT_LIVE';
      message: string;
      schedule: ExamScheduleRow | null;
      detail?: SlotAccessDetail;
    }
> {
  const { uses_slot_scheduling, slots } = await loadSlotsForRequest(
    admin,
    input.facultyExamRequestId,
  );
  if (!uses_slot_scheduling || slots.length === 0) {
    return { allowed: false, code: 'NOT_LIVE', message: 'Slot schedule not configured.', schedule: null };
  }

  const roll =
    normalizeRoll(input.rollNumber) ||
    normalizeRoll(rollNumberFromUser(input.email ?? '', input.metadata ?? null));

  const assignment = await findStudentSlotAssignment(
    admin,
    input.facultyExamRequestId,
    roll,
  );

  if (!assignment) {
    return {
      allowed: false,
      code: 'SLOT_NOT_ASSIGNED',
      message:
        'This examination is locked. Your roll number is not assigned to any slot. Contact your faculty or the examination cell.',
      schedule: input.schedules[0] ?? null,
    };
  }

  const parsed = enrichScheduleSlots(slots);
  const mySlot = parsed.find((s) => s.slot_number === assignment.slot_number);
  const mySchedule =
    input.schedules.find((s) => (s as ExamScheduleRow & { slot_number?: number }).slot_number === assignment.slot_number) ??
    input.schedules.find((s) => s.title.includes(`Slot ${assignment.slot_number}`)) ??
    null;

  const detail: SlotAccessDetail = {
    assigned_slot: assignment.slot_number,
    slot_label: `Slot ${assignment.slot_number}`,
    window_label: mySlot
      ? `${mySlot.exam_date} · ${mySlot.start_time} – ${mySlot.end_time}`
      : 'See examination schedule',
  };

  if (!mySchedule) {
    return {
      allowed: false,
      code: 'NOT_LIVE',
      message: `Your slot is ${detail.slot_label} (${detail.window_label}). The schedule is not published yet — wait for admin approval.`,
      schedule: null,
      detail,
    };
  }

  const now = input.now ?? Date.now();

  if (
    !scheduleMatchesStudent(mySchedule, input.department, input.year)
  ) {
    return {
      allowed: false,
      code: 'SLOT_NOT_ASSIGNED',
      message: 'This examination is not scheduled for your department or academic year.',
      schedule: mySchedule,
      detail,
    };
  }

  if (isScheduleWindowOpen(mySchedule, now)) {
    return { allowed: true, schedule: mySchedule, detail };
  }

  const anyLive = input.schedules.filter((s) => isScheduleWindowOpen(s, now));
  if (anyLive.length > 0) {
    return {
      allowed: false,
      code: 'SLOT_WRONG_WINDOW',
      message: `This examination is locked for your account. You are assigned to ${detail.slot_label} (${detail.window_label}). Another slot is live now — open the test only during your slot time.`,
      schedule: mySchedule,
      detail,
    };
  }

  const start = mySlot ? new Date(mySlot.starts_at).toLocaleString() : '';
  const end = mySlot ? new Date(mySlot.ends_at).toLocaleString() : '';

  return {
    allowed: false,
    code: 'NOT_LIVE',
    message: `Your examination window (${detail.slot_label}) is ${detail.window_label}. ${start && end ? `Opens ${start} and closes ${end}.` : 'It is not live yet.'}`,
    schedule: mySchedule,
    detail,
  };
}

export async function createSchedulesFromSlots(
  admin: SupabaseClient,
  input: {
    requestId: string;
    testId: string;
    title: string;
    description: string | null;
    targetDepartments: string[];
    targetYears: string[];
    createdBy: string;
    slots: ExamScheduleSlotInput[];
  },
): Promise<string[]> {
  const parsed = enrichScheduleSlots(input.slots);
  const ids: string[] = [];

  for (const slot of parsed) {
    const payload: Record<string, unknown> = {
      title: `${input.title} · Slot ${slot.slot_number}`,
      description: input.description,
      notice: `${slot.roster.length} students · max ${slot.capacity}`,
      faculty_exam_request_id: input.requestId,
      test_id: input.testId,
      status: 'scheduled',
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      target_departments: input.targetDepartments,
      target_years: input.targetYears,
      created_by: input.createdBy,
      updated_at: new Date().toISOString(),
      slot_number: slot.slot_number,
      slot_capacity: slot.capacity,
    };

    const { data, error } = await admin
      .from('exam_schedules')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      const withoutSlotCols = { ...payload };
      delete withoutSlotCols.slot_number;
      delete withoutSlotCols.slot_capacity;
      const retry = await admin
        .from('exam_schedules')
        .insert(withoutSlotCols)
        .select('id')
        .single();
      if (retry.error) throw new Error(retry.error.message);
      if (retry.data?.id) ids.push(String(retry.data.id));
    } else if (data?.id) {
      ids.push(String(data.id));
    }
  }

  return ids;
}

export function filterSchedulesForStudentSlots(
  schedules: ExamScheduleRow[],
  assignedSlotNumber: number | null,
): ExamScheduleRow[] {
  if (assignedSlotNumber == null) return schedules;
  const slotSchedules = schedules.filter(
    (s) => (s as ExamScheduleRow & { slot_number?: number }).slot_number === assignedSlotNumber,
  );
  return slotSchedules.length > 0 ? slotSchedules : schedules;
}
