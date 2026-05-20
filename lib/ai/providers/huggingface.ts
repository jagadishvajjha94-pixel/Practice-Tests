import type { AiGenerateRequest, AiGenerateResult, AiProvider } from '@/lib/ai/providers/types';

/** Hugging Face Inference API — open weights (configure model via HF_MODEL). */
export function createHuggingfaceProvider(): AiProvider {
  return {
    id: 'huggingface',
    isConfigured() {
      return Boolean(process.env.HF_API_TOKEN?.trim() || process.env.HUGGINGFACE_API_KEY?.trim());
    },
    async generate(req: AiGenerateRequest): Promise<AiGenerateResult> {
      const token =
        process.env.HF_API_TOKEN?.trim() || process.env.HUGGINGFACE_API_KEY?.trim();
      if (!token) throw new Error('HF_API_TOKEN or HUGGINGFACE_API_KEY is not configured');

      const model =
        process.env.HF_MODEL?.trim() ||
        'mistralai/Mistral-7B-Instruct-v0.2';

      const url = `https://api-inference.huggingface.co/models/${model}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: req.prompt,
          parameters: {
            max_new_tokens: req.maxTokens ?? 4096,
            temperature: 0.65,
            return_full_text: false,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        if (res.status === 503) {
          throw new Error(
            'Hugging Face model is loading or rate-limited. Retry in a minute or set LOCAL_LLM_URL (Ollama) / OPENAI_API_KEY.',
          );
        }
        throw new Error(`Hugging Face error (${res.status}): ${err.slice(0, 200)}`);
      }

      const data = (await res.json()) as
        | { generated_text?: string }
        | Array<{ generated_text?: string }>;

      let text = '';
      if (Array.isArray(data)) {
        text = data[0]?.generated_text?.trim() ?? '';
      } else if (typeof data === 'object' && data.generated_text) {
        text = data.generated_text.trim();
      }

      if (!text && typeof data === 'object' && !Array.isArray(data)) {
        text = JSON.stringify(data).slice(0, 16000);
      }

      return {
        provider: 'huggingface',
        model,
        text,
        raw: data,
      };
    },
  };
}
