import type { AiGenerateRequest, AiGenerateResult, AiProvider } from '@/lib/ai/providers/types';

export function createOpenAiProvider(): AiProvider {
  return {
    id: 'openai',
    isConfigured() {
      return Boolean(process.env.OPENAI_API_KEY?.trim());
    },
    async generate(req: AiGenerateRequest): Promise<AiGenerateResult> {
      const key = process.env.OPENAI_API_KEY?.trim();
      if (!key) throw new Error('OPENAI_API_KEY is not configured');

      const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are an expert assessment content generator for campus recruitment.' },
            { role: 'user', content: req.prompt },
          ],
          max_tokens: req.maxTokens ?? 1200,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI error: ${err}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return {
        provider: 'openai',
        model,
        text: data.choices?.[0]?.message?.content?.trim() ?? '',
        raw: data,
      };
    },
  };
}
