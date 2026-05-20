import type { StudentEvaloraModule } from '@/lib/evalora/module-schedule';
import type { StudentExamSchedule } from '@/lib/exam-schedule';

export type PortalExamItem = {
  id: string;
  source: 'evalora' | 'faculty';
  kind: 'live' | 'upcoming';
  title: string;
  description: string;
  notice: string | null;
  starts_at: string;
  ends_at: string | null;
  href: string;
  icon: string;
  badge?: string;
  duration_minutes?: number | null;
  module_key?: string;
};

export type StudentPortalPayload = {
  featured: PortalExamItem | null;
  live: PortalExamItem[];
  upcoming: PortalExamItem[];
  department: string | null;
  year: string | null;
  message?: string;
};

function fromEvalora(mod: StudentEvaloraModule): PortalExamItem {
  return {
    id: mod.schedule_id,
    source: 'evalora',
    kind: mod.kind,
    title: mod.title,
    description: mod.description,
    notice: mod.notice,
    starts_at: mod.starts_at,
    ends_at: mod.ends_at,
    href: mod.href,
    icon: mod.icon,
    badge: mod.badge,
    module_key: mod.module_key,
  };
}

function fromFaculty(exam: StudentExamSchedule): PortalExamItem {
  return {
    id: exam.id,
    source: 'faculty',
    kind: exam.kind,
    title: exam.title,
    description: exam.description?.trim() || exam.topic?.trim() || 'Faculty department examination.',
    notice: exam.notice,
    starts_at: exam.starts_at,
    ends_at: exam.ends_at,
    href: exam.take_url,
    icon: '🏫',
    badge: exam.duration_minutes ? `${exam.duration_minutes} min` : undefined,
    duration_minutes: exam.duration_minutes,
  };
}

export function buildStudentPortalPayload(input: {
  evaloraLive: StudentEvaloraModule[];
  evaloraUpcoming: StudentEvaloraModule[];
  facultyLive: StudentExamSchedule[];
  facultyUpcoming: StudentExamSchedule[];
  department: string | null;
  year: string | null;
  message?: string;
}): StudentPortalPayload {
  const live = [
    ...input.facultyLive.map(fromFaculty),
    ...input.evaloraLive.map(fromEvalora),
  ];
  const upcoming = [
    ...input.facultyUpcoming.map(fromFaculty),
    ...input.evaloraUpcoming.map(fromEvalora),
  ].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  /** Featured card is only for tests that are live now (admin-triggered / window open). */
  let featured: PortalExamItem | null = null;
  if (live.length > 0) {
    featured = live[0];
  }

  return {
    featured,
    live,
    upcoming,
    department: input.department,
    year: input.year,
    message: input.message,
  };
}
