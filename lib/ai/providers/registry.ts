import { createClaudeProvider } from '@/lib/ai/providers/claude';
import { createGeminiProvider } from '@/lib/ai/providers/gemini';
import { createLocalLlmProvider } from '@/lib/ai/providers/local';
import { createOpenAiProvider } from '@/lib/ai/providers/openai';
import type { AiGenerateRequest, AiGenerateResult, AiProvider, AiProviderId } from '@/lib/ai/providers/types';

const providers: Record<AiProviderId, AiProvider> = {
  openai: createOpenAiProvider(),
  gemini: createGeminiProvider(),
  claude: createClaudeProvider(),
  local: createLocalLlmProvider(),
};

export function getAiProvider(id?: AiProviderId): AiProvider {
  const preferred = (process.env.AI_PROVIDER?.trim() as AiProviderId | undefined) ?? 'openai';
  const order: AiProviderId[] = id
    ? [id, preferred, 'openai', 'gemini', 'claude', 'local']
    : [preferred, 'openai', 'gemini', 'claude', 'local'];

  for (const key of order) {
    const p = providers[key];
    if (p?.isConfigured()) return p;
  }

  return providers.openai;
}

export async function generateWithAi(req: AiGenerateRequest): Promise<AiGenerateResult> {
  const provider = getAiProvider();
  if (!provider.isConfigured()) {
    throw new Error(
      'No AI provider configured. Set OPENAI_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY, or LOCAL_LLM_URL.',
    );
  }
  return provider.generate(req);
}
