import {
  getCodingLanguage,
  type CodingLanguageId,
} from '@/lib/coding/languages';
import { executeCodeLocal } from '@/lib/coding/execute-local';
import type { ExecuteResult } from '@/lib/coding/types';

export type { CodingLanguageId as CodingLanguage };
export type { ExecuteResult } from '@/lib/coding/types';

const PUBLIC_PISTON_HOST = 'emkc.org';

function useCustomPiston(): boolean {
  const url = process.env.PISTON_API_URL?.trim();
  if (!url || url.includes('YOUR_')) return false;
  try {
    const host = new URL(url).hostname;
    return host !== PUBLIC_PISTON_HOST && !host.endsWith('.emkc.org');
  } catch {
    return false;
  }
}

async function executeViaPiston(
  languageId: CodingLanguageId,
  sourceCode: string,
  stdin: string,
): Promise<ExecuteResult> {
  const lang = getCodingLanguage(languageId);
  const pistonUrl = process.env.PISTON_API_URL!.trim();
  const started = Date.now();
  const res = await fetch(pistonUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: lang.piston.language,
      version: lang.piston.version,
      files: [{ name: lang.fileName, content: sourceCode }],
      stdin,
      run_timeout: 8000,
      compile_timeout: 12000,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Piston HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }

  const data = (await res.json()) as {
    run?: { stdout?: string; stderr?: string; code?: number; memory?: number };
    compile?: { stdout?: string; stderr?: string; code?: number };
  };

  const compileErr = data.compile?.stderr ?? '';
  const runOut = data.run?.stdout ?? '';
  const runErr = data.run?.stderr ?? '';
  const stderr = [compileErr, runErr].filter(Boolean).join('\n');
  return {
    stdout: runOut,
    stderr,
    exitCode: data.run?.code ?? (compileErr ? 1 : 0),
    runtimeMs: Date.now() - started,
    memoryKb: data.run?.memory ?? null,
    engine: 'piston',
  };
}

/** Public emkc.org Piston is whitelist-only; local execution is the default for dev/college deploys. */
export async function executeCode(
  languageId: CodingLanguageId,
  sourceCode: string,
  stdin = '',
): Promise<ExecuteResult> {
  if (useCustomPiston()) {
    try {
      return await executeViaPiston(languageId, sourceCode, stdin);
    } catch {
      // Fall through to local runner
    }
  }

  try {
    return await executeCodeLocal(languageId, sourceCode, stdin);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Local execution failed';
    throw new Error(
      `${msg}. For cloud deploys, install language runtimes on the server or set PISTON_API_URL to your own Piston instance.`,
    );
  }
}
