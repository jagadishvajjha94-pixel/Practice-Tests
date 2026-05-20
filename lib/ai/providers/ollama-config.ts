/**
 * Ollama exposes OpenAI-compatible Chat Completions at `{origin}/v1/chat/completions`.
 * Env vars mirror common setups: LOCAL_LLM_URL, OLLAMA_BASE_URL, or OLLAMA_HOST.
 */

const DEFAULT_PORT = '11434';

/** First non-empty trimmed string, or undefined. */
function firstEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return undefined;
}

/** Base URL origin only (scheme + host + port), no path. */
function toOrigin(candidate: string): string {
  const trimmed = candidate.trim();
  const urlStr = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  try {
    const u = new URL(urlStr);
    if (!u.port) {
      u.port = DEFAULT_PORT;
    }
    return u.origin;
  } catch {
    return trimmed.replace(/\/$/, '');
  }
}

/**
 * Base URL for `{base}/v1/chat/completions`.
 */
export function getOllamaOpenAiBaseUrl(): string | undefined {
  const direct = firstEnv('LOCAL_LLM_URL', 'OLLAMA_BASE_URL');
  if (direct) return toOrigin(direct);

  const hostOnly = firstEnv('OLLAMA_HOST');
  if (hostOnly) return toOrigin(hostOnly);

  return undefined;
}

export function getOllamaModelName(): string {
  return firstEnv('LOCAL_LLM_MODEL', 'OLLAMA_MODEL') ?? 'llama3.2';
}

export function getOllamaChatTemperature(): number {
  const raw = firstEnv('LOCAL_LLM_TEMPERATURE', 'OLLAMA_TEMPERATURE');
  if (!raw) return 0.65;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(2, Math.max(0, n)) : 0.65;
}

export function isOllamaConfigured(): boolean {
  return Boolean(getOllamaOpenAiBaseUrl());
}
