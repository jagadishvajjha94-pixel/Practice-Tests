import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type CodingLanguage = 'python' | 'java' | 'c';

export interface ExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  runtimeMs: number;
  memoryKb: number | null;
  engine: 'piston' | 'local';
}

const PISTON_URL = process.env.PISTON_API_URL ?? 'https://emkc.org/api/v2/piston/execute';

const PISTON_LANG: Record<CodingLanguage, { language: string; version: string }> = {
  python: { language: 'python', version: '3.10.0' },
  java: { language: 'java', version: '15.0.2' },
  c: { language: 'c', version: '10.2.0' },
};

export async function executeCode(
  language: CodingLanguage,
  sourceCode: string,
  stdin = '',
): Promise<ExecuteResult> {
  const piston = await executeViaPiston(language, sourceCode, stdin).catch(() => null);
  if (piston) return piston;

  if (language === 'python' && process.env.ALLOW_LOCAL_CODE_EXEC === 'true') {
    return executePythonLocal(sourceCode, stdin);
  }

  throw new Error(
    'Code execution unavailable. Ensure outbound HTTPS to Piston or set ALLOW_LOCAL_CODE_EXEC=true for Python-only local runs.',
  );
}

async function executeViaPiston(
  language: CodingLanguage,
  sourceCode: string,
  stdin: string,
): Promise<ExecuteResult> {
  const spec = PISTON_LANG[language];
  const started = Date.now();
  const res = await fetch(PISTON_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: spec.language,
      version: spec.version,
      files: [{ name: language === 'java' ? 'Main.java' : 'main', content: sourceCode }],
      stdin,
      run_timeout: 8000,
      compile_timeout: 12000,
    }),
  });

  if (!res.ok) {
    throw new Error(`Piston HTTP ${res.status}`);
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

function runProcess(
  command: string,
  args: string[],
  stdin: string,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (exitCode: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode });
    };

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      finish(124);
    }, timeoutMs);

    proc.stdout.on('data', (chunk: Buffer | string) => {
      stdout += String(chunk);
    });
    proc.stderr.on('data', (chunk: Buffer | string) => {
      stderr += String(chunk);
    });
    proc.on('error', (err) => {
      stderr += String(err);
      finish(1);
    });
    proc.on('close', (code) => finish(code ?? 0));

    if (stdin) proc.stdin.write(stdin);
    proc.stdin.end();
  });
}

async function executePythonLocal(sourceCode: string, stdin: string): Promise<ExecuteResult> {
  const dir = await mkdtemp(join(tmpdir(), 'prepindia-code-'));
  const file = join(dir, 'main.py');
  const started = Date.now();
  try {
    await writeFile(file, sourceCode, 'utf8');
    const { stdout, stderr, exitCode } = await runProcess('python3', [file], stdin, 8000);
    return {
      stdout,
      stderr,
      exitCode,
      runtimeMs: Date.now() - started,
      memoryKb: null,
      engine: 'local',
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
