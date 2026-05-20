import type { SupabaseClient } from '@supabase/supabase-js';
import type { FacultyExamQuestion } from '@/lib/faculty-exams';
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
  if (input.syllabusTopicIds?.length) {
    const resolved = await resolveSyllabusTopicsForBuilder(admin, input.syllabusTopicIds);
    syllabusTopicUuids = resolved.map((t) => t.id).filter(looksLikeUuid);
    if (!syllabusTopicUuids.length && input.syllabusTopicIds.length) {
      throw new Error('Could not resolve syllabus topics to tag UUIDs. Re-select topics and try again.');
    }
  }

  const { data: row, error } = await admin
    .from('faculty_exam_requests')
    .insert({
      faculty_user_id: input.creatorUserId,
      department,
      topic: input.topic?.trim() || null,
      title: input.title.trim(),
      description: input.description?.trim() ?? null,
      target_years: input.targetYears,
      target_branches,
      duration_minutes: input.durationMinutes,
      questions_json: input.questions,
      status: 'pending',
      test_type: input.testType?.trim() || null,
      slot_key: input.slotKey?.trim() || null,
      syllabus_topic_ids: syllabusTopicUuids,
      questions_per_topic: input.questionsPerTopic ?? null,
      department_group_id:
        input.departmentGroupId && looksLikeUuid(input.departmentGroupId)
          ? input.departmentGroupId
          : null,
    })
    .select('id')
    .single();

  if (error || !row?.id) {
    throw new Error(error?.message ?? 'Could not save exam request');
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
