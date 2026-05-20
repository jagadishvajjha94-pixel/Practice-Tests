import type { AiGenerateRequest, AiGenerateResult, AiProvider } from '@/lib/ai/providers/types';
import {
  getOllamaChatTemperature,
  getOllamaModelName,
  getOllamaOpenAiBaseUrl,
} from '@/lib/ai/providers/ollama-config';

/** Ollama (or any OpenAI-compatible server) via `/v1/chat/completions`. */
export function createLocalLlmProvider(): AiProvider {
  return {
    id: 'local',
    isConfigured() {
      return Boolean(getOllamaOpenAiBaseUrl());
    },
    async generate(req: AiGenerateRequest): Promise<AiGenerateResult> {
      const base = getOllamaOpenAiBaseUrl();
      if (!base) throw new Error('LOCAL_LLM_URL or OLLAMA_HOST is not configured');

      const model = getOllamaModelName();
      const temperature = getOllamaChatTemperature();
      const max_tokens = req.maxTokens ?? 8192;

      const url = `${base}/v1/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens,
          messages: [{ role: 'user', content: req.prompt }],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(
          `Ollama error (${res.status}): ${err.slice(0, 400)}. Check the model is pulled: \`ollama pull ${model}\``,
        );
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return {
        provider: 'local',
        model,
        text: data.choices?.[0]?.message?.content?.trim() ?? '',
        raw: data,
      };
    },
  };
}
