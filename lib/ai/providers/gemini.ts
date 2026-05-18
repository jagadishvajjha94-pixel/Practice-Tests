import type { AiGenerateRequest, AiGenerateResult, AiProvider } from '@/lib/ai/providers/types';

export function createGeminiProvider(): AiProvider {
  return {
    id: 'gemini',
    isConfigured() {
      return Boolean(process.env.GEMINI_API_KEY?.trim());
    },
    async generate(req: AiGenerateRequest): Promise<AiGenerateResult> {
      const key = process.env.GEMINI_API_KEY?.trim();
      if (!key) throw new Error('GEMINI_API_KEY is not configured');

      const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: req.prompt }] }],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini error: ${err}`);
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      return { provider: 'gemini', model, text: text.trim(), raw: data };
    },
  };
}
