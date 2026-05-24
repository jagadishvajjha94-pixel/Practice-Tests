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
  branch?: string;
  academic_year?: string;
  password?: string;
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
        branch: entry.branch ? String(entry.branch).trim() : undefined,
        academic_year: entry.academic_year ? String(entry.academic_year).trim() : undefined,
        password: entry.password ? String(entry.password).trim() : undefined,
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

export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === ',' || ch === ';' || ch === '\t') && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function headerIndex(headers: string[], aliases: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const normalized = headers[i]!.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (aliases.some((alias) => normalized.includes(alias))) return i;
  }
  return -1;
}

function readCell(parts: string[], index: number): string | undefined {
  if (index < 0 || index >= parts.length) return undefined;
  const value = parts[index]?.trim();
  return value || undefined;
}

export function parseRosterCsv(text: string): ExamSlotRosterEntry[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const firstParts = splitCsvLine(lines[0]!);
  const headerCells = firstParts.map((p) => p.toLowerCase());
  const hasHeader =
    headerIndex(headerCells, ['roll', 'rollnumber', 'rollno', 'registration']) >= 0 ||
    headerIndex(headerCells, ['name', 'fullname', 'studentname']) >= 0 ||
    headerIndex(headerCells, ['email']) >= 0 ||
    headerIndex(headerCells, ['department', 'dept', 'branch']) >= 0;

  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rollIdx = hasHeader
    ? headerIndex(headerCells, ['roll', 'rollnumber', 'rollno', 'registration'])
    : 0;
  const nameIdx = hasHeader ? headerIndex(headerCells, ['name', 'fullname', 'studentname']) : 1;
  const emailIdx = hasHeader ? headerIndex(headerCells, ['email', 'mail']) : -1;
  const passwordIdx = hasHeader ? headerIndex(headerCells, ['password', 'pass', 'pwd']) : -1;
  const branchIdx = hasHeader
    ? headerIndex(headerCells, ['department', 'dept', 'branch'])
    : -1;
  const yearIdx = hasHeader
    ? headerIndex(headerCells, ['year', 'academicyear', 'batch'])
    : -1;

  const out: ExamSlotRosterEntry[] = [];
  const seen = new Set<string>();
  for (const line of dataLines) {
    const parts = splitCsvLine(line);
    const roll = normalizeRoll(readCell(parts, rollIdx >= 0 ? rollIdx : 0) ?? '');
    if (!roll || seen.has(roll)) continue;
    seen.add(roll);

    let email = emailIdx >= 0 ? readCell(parts, emailIdx) : undefined;
    let password = passwordIdx >= 0 ? readCell(parts, passwordIdx) : undefined;
    let branch = branchIdx >= 0 ? readCell(parts, branchIdx) : undefined;
    let academicYear = yearIdx >= 0 ? readCell(parts, yearIdx) : undefined;
    let studentName = nameIdx >= 0 ? readCell(parts, nameIdx) : undefined;

    if (!hasHeader && parts.length >= 2 && parts[1]?.includes('@')) {
      email = readCell(parts, 1);
      password = readCell(parts, 2);
      branch = readCell(parts, 3);
      academicYear = readCell(parts, 4);
      studentName = undefined;
    }

    out.push({
      roll_number: roll,
      student_name: studentName,
      email,
      branch,
      academic_year: academicYear,
      password,
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
        branch: student.branch ?? null,
        academic_year: student.academic_year ?? null,
        login_password: student.password ?? null,
      });
    }
  }
  if (rows.length === 0) return;

  let { error } = await admin.from('exam_slot_roster_entries').insert(rows);
  if (error?.message?.includes('branch') || error?.message?.includes('academic_year')) {
    const fallbackRows = rows.map((row) => {
      const { branch: _b, academic_year: _y, login_password: _p, ...rest } = row;
      return rest;
    });
    const retry = await admin.from('exam_slot_roster_entries').insert(fallbackRows);
    error = retry.error;
  }
  if (error?.message?.includes('login_password')) {
    const fallbackRows = rows.map((row) => {
      const { login_password: _p, ...rest } = row;
      return rest;
    });
    const retry = await admin.from('exam_slot_roster_entries').insert(fallbackRows);
    error = retry.error;
  }
  if (error && !error.message.includes('exam_slot_roster')) {
    throw new Error(error.message);
  }
}

export async function rebuildSlotsFromRosterEntries(
  admin: SupabaseClient,
  requestId: string,
  scheduleMeta?: ExamScheduleSlotInput[],
): Promise<ExamScheduleSlotInput[]> {
  const { data: entries, error } = await admin
    .from('exam_slot_roster_entries')
    .select('slot_number, roll_number, student_name, email, branch, academic_year, login_password')
    .eq('faculty_exam_request_id', requestId)
    .order('slot_number');

  if (error || !entries?.length) return [];

  const metaBySlot = new Map((scheduleMeta ?? []).map((slot) => [slot.slot_number, slot]));
  const bySlot = new Map<number, ExamSlotRosterEntry[]>();

  for (const row of entries) {
    const slotNum = Number(row.slot_number);
    if (!Number.isFinite(slotNum)) continue;
    const list = bySlot.get(slotNum) ?? [];
    list.push({
      roll_number: normalizeRoll(String(row.roll_number)),
      student_name: (row.student_name as string | null) ?? undefined,
      email: (row.email as string | null) ?? undefined,
      branch: (row.branch as string | null) ?? undefined,
      academic_year: (row.academic_year as string | null) ?? undefined,
      password: (row.login_password as string | null) ?? undefined,
    });
    bySlot.set(slotNum, list);
  }

  return Array.from(bySlot.keys())
    .sort((a, b) => a - b)
    .map((slotNum) => {
      const meta = metaBySlot.get(slotNum);
      return {
        slot_number: slotNum,
        exam_date: meta?.exam_date ?? '',
        start_time: meta?.start_time ?? '09:00',
        end_time: meta?.end_time ?? '11:00',
        capacity: meta?.capacity ?? EXAM_SLOT_CAPACITY_DEFAULT,
        roster: bySlot.get(slotNum) ?? [],
      };
    });
}

export type CreatedSlotSchedule = {
  scheduleId: string;
  slot_number: number;
};

export async function syncExamStudentRosters(
  admin: SupabaseClient,
  schedules: CreatedSlotSchedule[],
  slots: ExamScheduleSlotInput[],
): Promise<void> {
  if (schedules.length === 0) return;

  const scheduleBySlot = new Map(schedules.map((row) => [row.slot_number, row.scheduleId]));
  const scheduleIds = schedules.map((row) => row.scheduleId);

  await admin.from('exam_student_roster').delete().in('exam_schedule_id', scheduleIds);

  const rows: Array<Record<string, unknown>> = [];
  for (const slot of slots) {
    const scheduleId = scheduleBySlot.get(slot.slot_number);
    if (!scheduleId) continue;
    for (const student of slot.roster) {
      rows.push({
        exam_schedule_id: scheduleId,
        roll_number: student.roll_number,
        email: student.email ?? null,
        full_name: student.student_name ?? null,
        branch: student.branch ?? null,
        academic_year: student.academic_year ?? null,
      });
    }
  }

  if (rows.length === 0) return;

  const { error } = await admin.from('exam_student_roster').insert(rows);
  if (error && !error.message.includes('exam_student_roster')) {
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
): Promise<CreatedSlotSchedule[]> {
  const parsed = enrichScheduleSlots(input.slots);
  const created: CreatedSlotSchedule[] = [];

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
      if (retry.data?.id) {
        created.push({ scheduleId: String(retry.data.id), slot_number: slot.slot_number });
      }
    } else if (data?.id) {
      created.push({ scheduleId: String(data.id), slot_number: slot.slot_number });
    }
  }

  return created;
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
