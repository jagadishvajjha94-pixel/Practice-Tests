import { chmod, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import {
  getCodingLanguage,
  type CodingLanguageId,
} from '@/lib/coding/languages';
import {
  augmentedPathEnv,
  resolveCommand,
  resolveNode,
  resolvePython,
} from '@/lib/coding/resolve-command';
import type { ExecuteResult } from '@/lib/coding/types';

const RUN_TIMEOUT_MS = 10000;
const COMPILE_TIMEOUT_MS = 20000;

function runProcess(
  command: string,
  args: string[],
  stdin: string,
  cwd: string,
  timeoutMs = RUN_TIMEOUT_MS,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: augmentedPathEnv(),
    });
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
      stderr += '\n[Timed out after 8s]';
      finish(124);
    }, timeoutMs);

    proc.stdout.on('data', (chunk: Buffer | string) => {
      stdout += String(chunk);
    });
    proc.stderr.on('data', (chunk: Buffer | string) => {
      stderr += String(chunk);
    });
    proc.on('error', (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      stderr += msg.includes('ENOENT')
        ? `\n${msg}\n\nRuntime not found. On Vercel, set PISTON_API_URL to a self-hosted Piston instance. Locally, install the language runtime or restart the dev server from a terminal where \`python3 --version\` works.`
        : msg;
      finish(1);
    });
    proc.on('close', (code) => finish(code ?? 0));

    if (stdin) proc.stdin.write(stdin);
    proc.stdin.end();
  });
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'rce-code-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function runtimeMissingMessage(tool: string, detail: string): string {
  const vercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
  const hint = vercel
    ? 'Add PISTON_API_URL in Vercel env vars (self-hosted Piston) — serverless cannot run local compilers.'
    : 'Install the runtime (e.g. `brew install python`) and restart `npm run dev` from Terminal, not only from the IDE.';
  return `${detail}\n\n${hint}`;
}

async function runPython(dir: string, source: string, stdin: string): Promise<ExecuteResult> {
  const file = join(dir, 'main.py');
  const started = Date.now();
  let python: string;
  try {
    python = resolvePython();
  } catch (e) {
    return {
      stdout: '',
      stderr: runtimeMissingMessage('Python', e instanceof Error ? e.message : 'Python not found'),
      exitCode: 1,
      runtimeMs: Date.now() - started,
      memoryKb: null,
      engine: 'local',
    };
  }
  await writeFile(file, source, 'utf8');
  const { stdout, stderr, exitCode } = await runProcess(python, [file], stdin, dir);
  return { stdout, stderr, exitCode, runtimeMs: Date.now() - started, memoryKb: null, engine: 'local' };
}

async function runJavaScript(dir: string, source: string, stdin: string): Promise<ExecuteResult> {
  const file = join(dir, 'main.js');
  const started = Date.now();
  await writeFile(file, source, 'utf8');
  const node = resolveNode();
  const { stdout, stderr, exitCode } = await runProcess(node, [file], stdin, dir);
  return { stdout, stderr, exitCode, runtimeMs: Date.now() - started, memoryKb: null, engine: 'local' };
}

async function runC(dir: string, source: string, stdin: string): Promise<ExecuteResult> {
  const src = join(dir, 'main.c');
  const bin = join(dir, 'main');
  const started = Date.now();
  await writeFile(src, source, 'utf8');
  const gcc = resolveCommand('gcc', [process.env.GCC_PATH, 'gcc', '/usr/bin/gcc', '/opt/homebrew/bin/gcc']);
  const compile = await runProcess(gcc, ['-O2', '-o', bin, src], '', dir, COMPILE_TIMEOUT_MS);
  if (compile.exitCode !== 0) {
    return {
      stdout: compile.stdout,
      stderr: compile.stderr || 'Compilation failed',
      exitCode: compile.exitCode,
      runtimeMs: Date.now() - started,
      memoryKb: null,
      engine: 'local',
    };
  }
  await chmod(bin, 0o755);
  const run = await runProcess(bin, [], stdin, dir);
  return {
    stdout: run.stdout,
    stderr: run.stderr,
    exitCode: run.exitCode,
    runtimeMs: Date.now() - started,
    memoryKb: null,
    engine: 'local',
  };
}

async function runCpp(dir: string, source: string, stdin: string): Promise<ExecuteResult> {
  const src = join(dir, 'main.cpp');
  const bin = join(dir, 'main');
  const started = Date.now();
  await writeFile(src, source, 'utf8');
  const gpp = resolveCommand('g++', [process.env.GPP_PATH, 'g++', '/usr/bin/g++', '/opt/homebrew/bin/g++']);
  const compile = await runProcess(gpp, ['-O2', '-std=c++17', '-o', bin, src], '', dir, COMPILE_TIMEOUT_MS);
  if (compile.exitCode !== 0) {
    return {
      stdout: compile.stdout,
      stderr: compile.stderr || 'Compilation failed',
      exitCode: compile.exitCode,
      runtimeMs: Date.now() - started,
      memoryKb: null,
      engine: 'local',
    };
  }
  await chmod(bin, 0o755);
  const run = await runProcess(bin, [], stdin, dir);
  return {
    stdout: run.stdout,
    stderr: run.stderr,
    exitCode: run.exitCode,
    runtimeMs: Date.now() - started,
    memoryKb: null,
    engine: 'local',
  };
}

async function runJava(dir: string, source: string, stdin: string): Promise<ExecuteResult> {
  const file = join(dir, 'Main.java');
  const started = Date.now();
  await writeFile(file, source, 'utf8');
  const javac = resolveCommand('javac', [process.env.JAVAC_PATH, 'javac', '/usr/bin/javac']);
  const compile = await runProcess(javac, [file], '', dir, COMPILE_TIMEOUT_MS);
  if (compile.exitCode !== 0) {
    return {
      stdout: compile.stdout,
      stderr: compile.stderr || 'Compilation failed',
      exitCode: compile.exitCode,
      runtimeMs: Date.now() - started,
      memoryKb: null,
      engine: 'local',
    };
  }
  const java = resolveCommand('java', [process.env.JAVA_PATH, 'java', '/usr/bin/java']);
  const run = await runProcess(java, ['-cp', dir, 'Main'], stdin, dir);
  return {
    stdout: run.stdout,
    stderr: run.stderr,
    exitCode: run.exitCode,
    runtimeMs: Date.now() - started,
    memoryKb: null,
    engine: 'local',
  };
}

async function runGo(dir: string, source: string, stdin: string): Promise<ExecuteResult> {
  const file = join(dir, 'main.go');
  const started = Date.now();
  await writeFile(file, source, 'utf8');
  const go = resolveCommand('go', [process.env.GO_PATH, 'go', '/usr/local/go/bin/go', '/opt/homebrew/bin/go']);
  const run = await runProcess(go, ['run', file], stdin, dir, COMPILE_TIMEOUT_MS);
  if (run.stderr.includes('ENOENT') || run.stderr.includes('not found')) {
    return {
      stdout: '',
      stderr: 'Go is not installed on this server. Install Go or use another language.',
      exitCode: 1,
      runtimeMs: Date.now() - started,
      memoryKb: null,
      engine: 'local',
    };
  }
  return {
    stdout: run.stdout,
    stderr: run.stderr,
    exitCode: run.exitCode,
    runtimeMs: Date.now() - started,
    memoryKb: null,
    engine: 'local',
  };
}

async function runCSharp(dir: string, source: string, stdin: string): Promise<ExecuteResult> {
  const file = join(dir, 'Main.cs');
  const started = Date.now();
  await writeFile(file, source, 'utf8');

  const compile = await runProcess('mcs', ['-out:Main.exe', file], '', dir, 12000);
  if (compile.exitCode !== 0) {
    const dotnetCompile = await runProcess(
      'dotnet',
      ['new', 'console', '-o', 'proj', '--force'],
      '',
      dir,
      15000,
    );
    if (dotnetCompile.exitCode !== 0) {
      return {
        stdout: compile.stdout,
        stderr:
          compile.stderr ||
          'C# requires `mcs` (Mono) or `dotnet` SDK on the server. Install Mono or .NET SDK.',
        exitCode: 1,
        runtimeMs: Date.now() - started,
        memoryKb: null,
        engine: 'local',
      };
    }
    await writeFile(join(dir, 'proj', 'Program.cs'), source, 'utf8');
    const dotnetRun = await runProcess('dotnet', ['run', '--project', 'proj'], stdin, dir, 15000);
    return {
      stdout: dotnetRun.stdout,
      stderr: dotnetRun.stderr,
      exitCode: dotnetRun.exitCode,
      runtimeMs: Date.now() - started,
      memoryKb: null,
      engine: 'local',
    };
  }

  const run = await runProcess('mono', ['Main.exe'], stdin, dir);
  return {
    stdout: run.stdout,
    stderr: run.stderr,
    exitCode: run.exitCode,
    runtimeMs: Date.now() - started,
    memoryKb: null,
    engine: 'local',
  };
}

export async function executeCodeLocal(
  languageId: CodingLanguageId,
  sourceCode: string,
  stdin = '',
): Promise<ExecuteResult> {
  return withTempDir(async (dir) => {
    switch (languageId) {
      case 'python':
        return runPython(dir, sourceCode, stdin);
      case 'javascript':
        return runJavaScript(dir, sourceCode, stdin);
      case 'c':
        return runC(dir, sourceCode, stdin);
      case 'cpp':
        return runCpp(dir, sourceCode, stdin);
      case 'java':
        return runJava(dir, sourceCode, stdin);
      case 'go':
        return runGo(dir, sourceCode, stdin);
      case 'csharp':
        return runCSharp(dir, sourceCode, stdin);
      default: {
        const lang = getCodingLanguage(languageId);
        return {
          stdout: '',
          stderr: `Local runner not configured for ${lang.label}`,
          exitCode: 1,
          runtimeMs: 0,
          memoryKb: null,
          engine: 'local',
        };
      }
    }
  });
}
