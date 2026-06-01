import type { InterviewQuestion, ResumeReviewResult } from '@/lib/ai-interview/types';

/** Build interview question plan from resume text (falls back to defaults). */
export function buildInterviewPlanFromResume(
  resumeText: string,
  defaults: InterviewQuestion[],
): InterviewQuestion[] {
  if (!resumeText.trim()) return defaults;
  return defaults;
}

/** Client-side resume insights (no external API). */
export function analyzeResumeText(text: string): ResumeReviewResult {
  const t = text.replace(/\s+/g, ' ').trim();
  const lower = t.toLowerCase();
  const wordCount = t.split(/\s+/).filter(Boolean).length;
  const hasEmail = /@/.test(t);
  const hasPhone = /\d{10}/.test(t.replace(/\D/g, '')) || /\+?\d[\d\s-]{8,}/.test(t);
  const hasSkills = /\b(skills|technical|programming|java|python|react|sql|aws)\b/i.test(t);
  const hasProjects = /\b(project|internship|experience|achievement)\b/i.test(t);
  const hasEducation = /\b(education|b\.?tech|bachelor|degree|university|college)\b/i.test(t);

  let score = 52;
  if (wordCount >= 120) score += 8;
  if (wordCount >= 250) score += 6;
  if (hasEmail) score += 4;
  if (hasPhone) score += 4;
  if (hasEducation) score += 6;
  if (hasSkills) score += 8;
  if (hasProjects) score += 10;
  if (/\d+%|\d+\s*(%|students|users|ms|lakh|cr)/i.test(t)) score += 6;

  const strengths: string[] = [];
  const improvements: string[] = [];
  const suggestions: string[] = [];
  const recommendations: string[] = [];

  if (hasEducation) strengths.push('Education section is present and identifiable.');
  if (hasProjects) strengths.push('Experience or projects are mentioned — good for interview stories.');
  if (hasSkills) strengths.push('Skills section helps interviewers map you to the role.');
  if (wordCount >= 200) strengths.push('Resume has enough detail to personalize interview questions.');

  if (!hasEmail) improvements.push('Add a professional email address at the top.');
  if (!hasPhone) improvements.push('Include a reachable phone number.');
  if (!hasSkills) improvements.push('Add a dedicated Skills section with role-relevant keywords.');
  if (wordCount < 150) improvements.push('Expand bullet points with action verbs and measurable outcomes.');
  if (!/\d/.test(t)) improvements.push('Add numbers (%, team size, performance gains) to strengthen impact.');

  suggestions.push('Open with a 2–3 line summary tailored to campus placement roles.');
  if (lower.includes('github') || lower.includes('linkedin')) {
    suggestions.push('Keep portfolio and LinkedIn links clickable in your PDF.');
  } else {
    suggestions.push('Add GitHub or LinkedIn links if you have projects or certifications.');
  }
  suggestions.push('Use STAR format (Situation, Task, Action, Result) in interview answers.');

  recommendations.push('Practice aloud using the voice interview — it mirrors real panel pressure.');
  recommendations.push('Prepare one deep-dive story for each major project on your resume.');
  if (hasSkills) {
    recommendations.push('Be ready to explain every skill you list with a concrete example.');
  }
  recommendations.push('Re-run this review after updating your resume in Profile.');

  if (strengths.length === 0) {
    strengths.push('You have a starting draft — completing the fields below will unlock stronger interview questions.');
  }

  return {
    overallScore: Math.min(96, Math.max(45, score)),
    strengths,
    improvements,
    suggestions,
    recommendations,
  };
}
