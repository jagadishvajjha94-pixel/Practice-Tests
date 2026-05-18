import type { AiGenerateRequest, AiGenerateResult, AiProvider } from '@/lib/ai/providers/types';

/** Ollama / local OpenAI-compatible endpoint (optional). */
export function createLocalLlmProvider(): AiProvider {
  return {
    id: 'local',
    isConfigured() {
      return Boolean(process.env.LOCAL_LLM_URL?.trim());
    },
    async generate(req: AiGenerateRequest): Promise<AiGenerateResult> {
      const base = process.env.LOCAL_LLM_URL?.trim();
      if (!base) throw new Error('LOCAL_LLM_URL is not configured');

      const model = process.env.LOCAL_LLM_MODEL?.trim() || 'llama3';
      const res = await fetch(`${base.replace(/\/$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: req.prompt }],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Local LLM error: ${err}`);
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
