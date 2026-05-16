import type { SupabaseClient, User as AuthUser } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/types';
import { formatSupabaseError } from '@/lib/utils';

export const RESUME_MAX_CHARS = 12_000;

export function isUsersTableMissingError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: string }).code;
  const message = String((err as { message?: string }).message ?? '').toLowerCase();
  return code === 'PGRST205' || message.includes("could not find the table") && message.includes('users');
}

/** Ensure a row in public.users for the signed-in student (insert on first visit). */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  authUser: AuthUser,
): Promise<{ profile: UserProfile | null; error: string | null; tableMissing: boolean }> {
  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (!fetchError && existing) {
    return { profile: existing as UserProfile, error: null, tableMissing: false };
  }

  if (fetchError && isUsersTableMissingError(fetchError)) {
    return { profile: null, error: formatSupabaseError(fetchError), tableMissing: true };
  }

  if (fetchError && fetchError.code !== 'PGRST116') {
    return { profile: null, error: formatSupabaseError(fetchError), tableMissing: false };
  }

  const payload = {
    id: authUser.id,
    email: authUser.email ?? '',
    full_name: (authUser.user_metadata?.full_name as string | undefined) ?? '',
    phone: null,
    subscription_status: 'free' as const,
    resume_text: null,
    resume_file_name: null,
    resume_storage_path: null,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('users')
    .insert([payload])
    .select('*')
    .single();

  if (insertError) {
    if (isUsersTableMissingError(insertError)) {
      return { profile: null, error: formatSupabaseError(insertError), tableMissing: true };
    }
    return { profile: null, error: formatSupabaseError(insertError), tableMissing: false };
  }

  return { profile: inserted as UserProfile, error: null, tableMissing: false };
}

export function resumeSnippet(text: string | null | undefined, max = 400): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export interface InterviewQuestionTemplate {
  question: string;
  expectedKeywords: string[];
  feedback: string;
}

export function buildInterviewPlanFromResume(
  resumeText: string | null | undefined,
  fallback: InterviewQuestionTemplate[],
): InterviewQuestionTemplate[] {
  const snippet = resumeSnippet(resumeText, 350);
  if (!snippet) return fallback;

  const lower = snippet.toLowerCase();
  const skillHint =
    /\b(java|python|react|node|sql|aws|data|ml|ai)\b/i.exec(snippet)?.[0] ?? 'your technical skills';

  return [
    {
      question: `I have reviewed your resume. Please introduce yourself and expand on this highlight: "${snippet.slice(0, 140)}${snippet.length > 140 ? '…' : ''}"`,
      expectedKeywords: ['experience', 'education', 'project', 'skills'],
      feedback: 'Strong start when you connect your resume facts to the role with clear examples.',
    },
    {
      question: `Your resume mentions relevant experience. Describe a project or achievement that demonstrates ${skillHint}.`,
      expectedKeywords: ['project', 'problem', 'solution', 'result'],
      feedback: 'Use STAR format: Situation, Task, Action, Result with numbers where possible.',
    },
    {
      question: 'What is your greatest strength for a campus placement role, and how does your resume support it?',
      expectedKeywords: ['strengths', 'skills', 'relevant', 'example'],
      feedback: 'Tie one strength to a concrete bullet from your resume.',
    },
    {
      question: lower.includes('intern') || lower.includes('project')
        ? 'Walk me through one internship or academic project from your resume — your role and outcome.'
        : 'Describe a challenging situation you handled and what you learned.',
      expectedKeywords: ['challenge', 'learning', 'team', 'outcome'],
      feedback: 'Interviewers look for ownership and measurable impact.',
    },
    {
      question: 'Where do you see yourself in three to five years, building on the path shown in your resume?',
      expectedKeywords: ['growth', 'goals', 'learning', 'career'],
      feedback: 'Align ambition with learning and contribution, not vague promises.',
    },
  ];
}
