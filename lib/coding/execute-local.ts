import { chmod, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import {
  getCodingLanguage,
  type CodingLanguageId,
} from '@/lib/coding/languages';
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
      stderr += err instanceof Error ? err.message : String(err);
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

async function runPython(dir: string, source: string, stdin: string): Promise<ExecuteResult> {
  const file = join(dir, 'main.py');
  const started = Date.now();
  await writeFile(file, source, 'utf8');
  const { stdout, stderr, exitCode } = await runProcess('python3', [file], stdin, dir);
  return { stdout, stderr, exitCode, runtimeMs: Date.now() - started, memoryKb: null, engine: 'local' };
}

async function runJavaScript(dir: string, source: string, stdin: string): Promise<ExecuteResult> {
  const file = join(dir, 'main.js');
  const started = Date.now();
  await writeFile(file, source, 'utf8');
  const { stdout, stderr, exitCode } = await runProcess('node', [file], stdin, dir);
  return { stdout, stderr, exitCode, runtimeMs: Date.now() - started, memoryKb: null, engine: 'local' };
}

async function runC(dir: string, source: string, stdin: string): Promise<ExecuteResult> {
  const src = join(dir, 'main.c');
  const bin = join(dir, 'main');
  const started = Date.now();
  await writeFile(src, source, 'utf8');
  const compile = await runProcess('gcc', ['-O2', '-o', bin, src], '', dir, COMPILE_TIMEOUT_MS);
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
  const compile = await runProcess('g++', ['-O2', '-std=c++17', '-o', bin, src], '', dir, COMPILE_TIMEOUT_MS);
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
  const compile = await runProcess('javac', [file], '', dir, COMPILE_TIMEOUT_MS);
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
  const run = await runProcess('java', ['-cp', dir, 'Main'], stdin, dir);
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
  const run = await runProcess('go', ['run', file], stdin, dir, COMPILE_TIMEOUT_MS);
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
