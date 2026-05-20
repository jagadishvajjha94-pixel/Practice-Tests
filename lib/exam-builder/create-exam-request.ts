import type { SupabaseClient } from '@supabase/supabase-js';
import type { FacultyExamQuestion } from '@/lib/faculty-exams';
import { augmentExamQuestionsWithCoding } from '@/lib/exam-builder/programming-syllabus';
import { resolveSyllabusTopicsForBuilder } from '@/lib/exam-builder/draw-questions';
import { looksLikeUuid } from '@/lib/exam-builder/id-utils';
import { getGroupDepartments, resolveExamBranchTargeting } from '@/lib/department-groups';
import { publishFacultyExamRequest } from '@/lib/publish-faculty-exam';

export type CreateExamRequestInput = {
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
  /** pending = faculty submit; approved = admin direct publish */
  status: 'pending' | 'approved';
  autoPublish?: boolean;
  autoGoLive?: boolean;
  goLiveNotice?: string | null;
};

export type CreateExamRequestResult = {
  requestId: string;
  testId?: string;
  scheduleId?: string;
  department: string;
  target_branches: string[];
};

export async function createFacultyExamRequestRecord(
  admin: SupabaseClient,
  input: CreateExamRequestInput,
): Promise<CreateExamRequestResult> {
  if (!input.questions.length) {
    throw new Error('Add at least one MCQ question');
  }
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
    if (!syllabusTopicUuids.length && input.syllabusTopicIds.length) {
      throw new Error('Could not resolve syllabus topics to tag UUIDs. Re-select topics and try again.');
    }
  }

  const examQuestions = augmentExamQuestionsWithCoding(
    input.questions,
    syllabusTopicSlugs.length ? syllabusTopicSlugs : input.syllabusTopicIds ?? [],
    input.testType,
  );

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
  };

  const groupId =
    input.departmentGroupId && looksLikeUuid(input.departmentGroupId)
      ? input.departmentGroupId
      : null;
  if (groupId) {
    insertPayload.department_group_id = groupId;
  }

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
    if (!error) {
      console.warn(
        'faculty_exam_requests.department_group_id missing — saved without group. Run migration 023_faculty_department_group_id.sql in Supabase.',
      );
    }
  }

  if (error || !row?.id) {
    const hint = error?.message?.includes('department_group_id')
      ? `${error?.message ?? 'Could not save exam request'} — Run migration 023_faculty_department_group_id.sql in Supabase SQL editor, wait 30s, retry.`
      : (error?.message ?? 'Could not save exam request');
    throw new Error(hint);
  }

  const requestId = row.id as string;
  let testId: string | undefined;
  let scheduleId: string | undefined;

  if (input.autoPublish) {
    const published = await publishFacultyExamRequest(admin, requestId, input.creatorUserId);
    testId = published.testId;

    if (input.autoGoLive && testId) {
      const targetDepartments = Array.from(new Set([department, ...target_branches]));
      const { data: schedule, error: scheduleErr } = await admin
        .from('exam_schedules')
        .insert({
          title: input.title.trim(),
          description: input.description?.trim() ?? null,
          notice: input.goLiveNotice ?? null,
          faculty_exam_request_id: requestId,
          test_id: testId,
          status: 'live',
          starts_at: new Date().toISOString(),
          ends_at: null,
          target_departments: targetDepartments,
          target_years: input.targetYears,
          created_by: input.creatorUserId,
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (scheduleErr) {
        throw new Error(scheduleErr.message);
      }
      scheduleId = schedule?.id as string | undefined;
    }
  }

  return { requestId, testId, scheduleId, department, target_branches };
}
