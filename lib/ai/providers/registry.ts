import { createClaudeProvider } from '@/lib/ai/providers/claude';
import { createGeminiProvider } from '@/lib/ai/providers/gemini';
import { createHuggingfaceProvider } from '@/lib/ai/providers/huggingface';
import { createLocalLlmProvider } from '@/lib/ai/providers/local';
import { createMockAiProvider } from '@/lib/ai/providers/mock';
import { isOllamaConfigured } from '@/lib/ai/providers/ollama-config';
import { createOpenAiProvider } from '@/lib/ai/providers/openai';
import type { AiGenerateRequest, AiGenerateResult, AiProvider, AiProviderId } from '@/lib/ai/providers/types';

const providers: Record<AiProviderId, AiProvider> = {
  openai: createOpenAiProvider(),
  gemini: createGeminiProvider(),
  claude: createClaudeProvider(),
  huggingface: createHuggingfaceProvider(),
  local: createLocalLlmProvider(),
  mock: createMockAiProvider(),
};

function normalizeExplicitProvider(raw: string): AiProviderId | undefined {
  const t = raw.trim().toLowerCase();
  if (!t) return undefined;
  if (t === 'ollama') return 'local';
  if (t in providers) return t as AiProviderId;
  return undefined;
}

/**
 * When AI_PROVIDER is unset: prefer Ollama if configured, else Hugging Face if configured, else huggingface (noop).
 * If both Ollama and HF are set, prefer Ollama for typical local-dev setups.
 */
function resolvePreferredProvider(): AiProviderId {
  const explicit = process.env.AI_PROVIDER?.trim();
  if (explicit) {
    const id = normalizeExplicitProvider(explicit);
    if (id) return id;
  }

  const localUp = isOllamaConfigured();
  const hfUp =
    Boolean(process.env.HF_API_TOKEN?.trim()) ||
    Boolean(process.env.HUGGINGFACE_API_KEY?.trim());

  if (localUp && hfUp) return 'local';
  if (localUp) return 'local';
  if (hfUp) return 'huggingface';
  return 'huggingface';
}

function dedupeOrder(order: AiProviderId[]): AiProviderId[] {
  const seen = new Set<AiProviderId>();
  const out: AiProviderId[] = [];
  for (const id of order) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function getAiProvider(id?: AiProviderId): AiProvider {
  const preferred = resolvePreferredProvider();
  const order = dedupeOrder(
    id
      ? [id, preferred, 'local', 'huggingface', 'openai', 'gemini', 'claude']
      : [preferred, 'local', 'huggingface', 'openai', 'gemini', 'claude'],
  );

  for (const key of order) {
    const p = providers[key];
    if (p?.isConfigured()) return p;
  }

  if (providers.mock.isConfigured()) {
    return providers.mock;
  }

  return providers.openai;
}

export async function generateWithAi(req: AiGenerateRequest): Promise<AiGenerateResult> {
  const provider = getAiProvider();
  if (!provider.isConfigured()) {
    throw new Error(
      'No AI provider configured. Run Ollama (OLLAMA_HOST or LOCAL_LLM_URL), or set HF_API_TOKEN / OPENAI_API_KEY / GEMINI_API_KEY / ANTHROPIC_API_KEY. Dev fallback: omit keys for mock MCQs or set AI_MOCK=1 in production demos only.',
    );
  }
  return provider.generate(req);
}
