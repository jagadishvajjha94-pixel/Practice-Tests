export type AiProviderId = 'openai' | 'gemini' | 'claude' | 'huggingface' | 'local' | 'mock';

export type AiTaskType =
  | 'mcq_generate'
  | 'coding_question_generate'
  | 'interview_question_generate'
  | 'performance_analyze'
  | 'coding_hint'
  | 'code_explain'
  | 'resume_analyze'
  | 'recommend';

export interface AiGenerateRequest {
  task: AiTaskType;
  prompt: string;
  context?: Record<string, unknown>;
  maxTokens?: number;
}

export interface AiGenerateResult {
  provider: AiProviderId;
  model: string;
  text: string;
  raw?: unknown;
}

export interface AiProvider {
  id: AiProviderId;
  isConfigured(): boolean;
  generate(req: AiGenerateRequest): Promise<AiGenerateResult>;
}
