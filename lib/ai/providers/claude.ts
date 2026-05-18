import type { AiGenerateRequest, AiGenerateResult, AiProvider } from '@/lib/ai/providers/types';

export function createClaudeProvider(): AiProvider {
  return {
    id: 'claude',
    isConfigured() {
      return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
    },
    async generate(req: AiGenerateRequest): Promise<AiGenerateResult> {
      const key = process.env.ANTHROPIC_API_KEY?.trim();
      if (!key) throw new Error('ANTHROPIC_API_KEY is not configured');

      const model = process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-20250514';
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: req.maxTokens ?? 1200,
          messages: [{ role: 'user', content: req.prompt }],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Claude error: ${err}`);
      }

      const data = (await res.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };
      const text =
        data.content?.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('') ?? '';
      return { provider: 'claude', model, text: text.trim(), raw: data };
    },
  };
}
