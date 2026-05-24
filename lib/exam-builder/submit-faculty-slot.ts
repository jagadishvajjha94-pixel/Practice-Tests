import type { SupabaseClient } from '@supabase/supabase-js';
import type { FacultyExamQuestion } from '@/lib/faculty-exams';
import { augmentExamQuestionsWithCoding } from '@/lib/exam-builder/programming-syllabus';
import { resolveSyllabusTopicsForBuilder } from '@/lib/exam-builder/draw-questions';
import { looksLikeUuid } from '@/lib/exam-builder/id-utils';
import { getGroupDepartments, resolveExamBranchTargeting } from '@/lib/department-groups';
import {
  ELEVATEX_PLACEHOLDER_QUESTIONS,
  isElevateXBuilderTestType,
} from '@/lib/exam-builder/elevatex-exam';
import type { ExamScheduleSlotInput } from '@/lib/exam-schedule-slots';
import { persistSlotRosterForSlot } from '@/lib/exam-schedule-slots';
import {
  canSubmitSlotNumber,
  emptySlotDrafts,
  markSlotPending,
  mergeSlotList,
  parseSlotsWithApproval,
  saveRequestSlotJson,
  type ExamScheduleSlotWithApproval,
} from '@/lib/exam-slot-approval';

export type SubmitFacultySlotInput = {
  creatorUserId: string;
  primaryDepartment: string;
  title: string;
  description?: string | null;
  topic?: string | null;
  targetYears: string[];
  extraBranches?: string[];
  departmentGroupId?: string | null;
  durationMinutes: number;
  questions: FacultyExamQuestion[];
  testType?: string | null;
  slotKey?: string | null;
  syllabusTopicIds?: string[];
  questionsPerTopic?: number | null;
  requestId?: string | null;
  submitSlotNumber: number;
  scheduleSlots: ExamScheduleSlotInput[];
};

export async function submitFacultyExamSlotForApproval(
  admin: SupabaseClient,
  input: SubmitFacultySlotInput,
): Promise<{ requestId: string; slot_number: number }> {
  const slotNum = Math.floor(input.submitSlotNumber);
  if (slotNum < 1 || slotNum > 8) {
    throw new Error('Invalid slot number');
  }

  const isElevateX = isElevateXBuilderTestType(input.testType);
  if (!input.targetYears.length) {
    throw new Error('Select at least one target year');
  }

  const groupDepartments = await getGroupDepartments(admin, input.departmentGroupId);
  const { department, target_branches } = resolveExamBranchTargeting({
    primaryDepartment: input.primaryDepartment,
    departmentGroupId: input.departmentGroupId,
    groupDepartments,
    extraBranches: input.extraBranches,
  });

  if (!department) {
    throw new Error('Set a primary department or choose a department group');
  }

  let syllabusTopicUuids: string[] = [];
  let syllabusTopicSlugs: string[] = [];
  if (input.syllabusTopicIds?.length) {
    const resolved = await resolveSyllabusTopicsForBuilder(admin, input.syllabusTopicIds);
    syllabusTopicUuids = resolved.map((t) => t.id).filter(looksLikeUuid);
    syllabusTopicSlugs = resolved.map((t) => t.slug);
  }

  const examQuestions = isElevateX
    ? ELEVATEX_PLACEHOLDER_QUESTIONS
    : augmentExamQuestionsWithCoding(
        input.questions,
        syllabusTopicSlugs.length ? syllabusTopicSlugs : input.syllabusTopicIds ?? [],
        input.testType,
      );

  if (!isElevateX && examQuestions.length === 0) {
    throw new Error('Add at least one MCQ question');
  }

  let currentSlots: ExamScheduleSlotWithApproval[] = emptySlotDrafts();
  let existingRequest: Record<string, unknown> | null = null;

  if (input.requestId) {
    const { data, error } = await admin
      .from('faculty_exam_requests')
      .select('*')
      .eq('id', input.requestId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Exam request not found');
    if (data.faculty_user_id !== input.creatorUserId) {
      throw new Error('You can only update your own exam requests');
    }
    if (data.status === 'rejected') {
      throw new Error('This exam request was rejected');
    }
    existingRequest = data as Record<string, unknown>;
    currentSlots = parseSlotsWithApproval(data.schedule_slots_json);
  }

  const merged = mergeSlotList(currentSlots, input.scheduleSlots);
  const submitCheck = canSubmitSlotNumber(merged, slotNum);
  if (!submitCheck.ok) {
    throw new Error(submitCheck.reason);
  }

  const slotsAfterSubmit = markSlotPending(merged, slotNum);

  if (existingRequest) {
    const { error } = await admin
      .from('faculty_exam_requests')
      .update({
        title: input.title.trim(),
        description: input.description?.trim() ?? null,
        topic: input.topic?.trim() || null,
        target_years: input.targetYears,
        target_branches,
        duration_minutes: input.durationMinutes,
        questions_json: examQuestions,
        test_type: input.testType?.trim() || null,
        slot_key: input.slotKey?.trim() || null,
        syllabus_topic_ids: syllabusTopicUuids,
        questions_per_topic: input.questionsPerTopic ?? null,
        uses_slot_scheduling: true,
        schedule_slots_json: slotsAfterSubmit,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.requestId);

    if (error) throw new Error(error.message);

    const requestId = String(input.requestId);
    const slot = slotsAfterSubmit.find((s) => s.slot_number === slotNum)!;
    await persistSlotRosterForSlot(admin, requestId, slot);
    return { requestId, slot_number: slotNum };
  }

  const insertPayload: Record<string, unknown> = {
    faculty_user_id: input.creatorUserId,
    department,
    topic: input.topic?.trim() || null,
    title: input.title.trim(),
    description: input.description?.trim() ?? null,
    target_years: input.targetYears,
    target_branches,
    duration_minutes: input.durationMinutes,
    questions_json: examQuestions,
    status: 'pending',
    test_type: input.testType?.trim() || null,
    slot_key: input.slotKey?.trim() || null,
    syllabus_topic_ids: syllabusTopicUuids,
    questions_per_topic: input.questionsPerTopic ?? null,
    uses_slot_scheduling: true,
    schedule_slots_json: slotsAfterSubmit,
  };

  const groupId =
    input.departmentGroupId && looksLikeUuid(input.departmentGroupId)
      ? input.departmentGroupId
      : null;
  if (groupId) insertPayload.department_group_id = groupId;

  let { data: row, error } = await admin
    .from('faculty_exam_requests')
    .insert(insertPayload)
    .select('id')
    .single();

  if (
    error?.message?.includes('department_group_id') &&
    (error.message.includes('schema cache') || error.message.includes('does not exist'))
  ) {
    delete insertPayload.department_group_id;
    const retry = await admin
      .from('faculty_exam_requests')
      .insert(insertPayload)
      .select('id')
      .single();
    row = retry.data;
    error = retry.error;
  }

  if (error || !row?.id) {
    throw new Error(error?.message ?? 'Could not save exam request');
  }

  const requestId = row.id as string;
  const slot = slotsAfterSubmit.find((s) => s.slot_number === slotNum)!;
  await persistSlotRosterForSlot(admin, requestId, slot);

  return { requestId, slot_number: slotNum };
}
