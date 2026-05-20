import type { AiGenerateRequest, AiGenerateResult, AiProvider } from '@/lib/ai/providers/types';

/** True when no real API keys are needed (local demo / dev only unless AI_MOCK=1). */
export function isMockAiEnabled(): boolean {
  if (process.env.AI_MOCK === '1') return true;
  if (process.env.AI_MOCK === '0') return false;
  return process.env.NODE_ENV === 'development';
}

function parseMcqCountFromPrompt(prompt: string): number {
  const m = prompt.match(/exactly\s+(\d+)\s+distinct/i);
  if (m) {
    return Math.min(50, Math.max(1, Number(m[1]) || 4));
  }
  return 4;
}

function parseTopicsFromPrompt(prompt: string): string[] {
  const m = prompt.match(/Coverage:\s*([^\n]+)/i);
  if (!m) return ['General'];
  return m[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildDemoMcqJson(prompt: string): string {
  const total = parseMcqCountFromPrompt(prompt);
  const topics = parseTopicsFromPrompt(prompt);
  const rows = [];

  for (let i = 0; i < total; i += 1) {
    const topic = topics[i % topics.length] ?? 'General';
    const n = i + 1;
    rows.push({
      question_text: `[Offline demo — ${topic}] Question ${n}: If a train travels 120 km in 2 hours at constant speed, how far does it travel in 5 hours at the same speed?`,
      option_a: '240 km',
      option_b: '300 km',
      option_c: '280 km',
      option_d: '260 km',
      correct_answer: 'B',
      explanation:
        'Demo placeholder from mock AI: speed = 60 km/h → 5 × 60 = 300 km. Set HF_API_TOKEN or LOCAL_LLM_URL for real MCQs.',
    });
  }

  return JSON.stringify(rows);
}

let mockGenerateWarned = false;

/**
 * Returns valid MCQ JSON for syllabus flows when no external AI is configured.
 * Enable in production only with AI_MOCK=1 (not recommended for real exams).
 */
export function createMockAiProvider(): AiProvider {
  return {
    id: 'mock',
    isConfigured() {
      return isMockAiEnabled();
    },
    async generate(req: AiGenerateRequest): Promise<AiGenerateResult> {
      if (process.env.NODE_ENV === 'development' && !mockGenerateWarned) {
        mockGenerateWarned = true;
        console.warn(
          '[prepindia-web] Mock AI: start Ollama (LOCAL_LLM_URL / OLLAMA_HOST) or set HF_API_TOKEN etc. Using demo MCQs.',
        );
      }

      if (req.task === 'mcq_generate') {
        return {
          provider: 'mock',
          model: 'mock-offline-demo',
          text: buildDemoMcqJson(req.prompt),
          raw: { mock: true },
        };
      }

      const stub =
        '[Mock AI] Start Ollama (LOCAL_LLM_URL or OLLAMA_HOST) or set HF_API_TOKEN / OPENAI_API_KEY / etc. See docs/OLLAMA.md.';
      return {
        provider: 'mock',
        model: 'mock-offline-demo',
        text: stub,
        raw: { mock: true, task: req.task },
      };
    },
  };
}
