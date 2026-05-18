export interface InterviewMessage {
  id: string;
  role: 'ai' | 'user';
  content: string;
}

export interface InterviewQuestion {
  question: string;
  expectedKeywords: string[];
  feedback: string;
}

export interface ResumeReviewResult {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  recommendations: string[];
}

export type InterviewStep = 'setup' | 'resume' | 'live' | 'done';
