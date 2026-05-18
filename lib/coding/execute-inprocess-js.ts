import { runInNewContext } from 'node:vm';
import type { ExecuteResult } from '@/lib/coding/types';

/** Run Node-style JS in-process (works on Vercel without spawning a shell). */
export function executeJavaScriptInProcess(sourceCode: string, stdin: string): ExecuteResult {
  const started = Date.now();
  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  const sandbox = {
    console: {
      log: (...args: unknown[]) => {
        stdout += `${args.map((a) => String(a)).join(' ')}\n`;
      },
      error: (...args: unknown[]) => {
        stderr += `${args.map((a) => String(a)).join(' ')}\n`;
      },
    },
    require: (id: string) => {
      if (id === 'fs') {
        return {
          readFileSync: (_path: unknown, _enc?: string) => stdin,
        };
      }
      throw new Error(`Module "${id}" is not available in the sandbox.`);
    },
    process: { stdin: null as unknown },
  };

  try {
    runInNewContext(sourceCode, sandbox, {
      timeout: 8000,
      displayErrors: true,
    });
  } catch (error) {
    stderr += error instanceof Error ? error.message : String(error);
    exitCode = 1;
  }

  return {
    stdout,
    stderr,
    exitCode,
    runtimeMs: Date.now() - started,
    memoryKb: null,
    engine: 'inprocess',
  };
}
