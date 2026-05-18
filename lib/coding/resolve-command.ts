import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const cache = new Map<string, string | null>();

/** PATH segments commonly missing when Node is started from an IDE (Cursor, VS Code). */
const EXTRA_PATH_DIRS =
  process.platform === 'win32'
    ? ['C:\\Python312', 'C:\\Python311', 'C:\\Python310']
    : [
        '/usr/local/bin',
        '/usr/bin',
        '/bin',
        '/opt/homebrew/bin',
        '/opt/local/bin',
        '/Library/Frameworks/Python.framework/Versions/Current/bin',
      ];

export function augmentedPathEnv(): NodeJS.ProcessEnv {
  const current = process.env.PATH ?? process.env.Path ?? '';
  const parts = current.split(process.platform === 'win32' ? ';' : ':').filter(Boolean);
  for (const dir of EXTRA_PATH_DIRS) {
    if (!parts.includes(dir)) parts.push(dir);
  }
  if (process.platform === 'win32') {
    return { ...process.env, Path: parts.join(';') };
  }
  return { ...process.env, PATH: parts.join(':') };
}

function which(binary: string, env: NodeJS.ProcessEnv): string | null {
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const out = execFileSync(cmd, [binary], { encoding: 'utf8', env, timeout: 3000 }).trim();
    const line = out.split(/\r?\n/).find((l) => l.trim().length > 0)?.trim();
    return line && existsSync(line) ? line : null;
  } catch {
    return null;
  }
}

/**
 * Resolve a runnable binary: env override → absolute path → PATH (with augmented dirs).
 */
export function resolveCommand(
  name: string,
  candidates: Array<string | undefined | null>,
): string {
  const key = [name, ...candidates].join('|');
  if (cache.has(key)) {
    const hit = cache.get(key);
    if (hit) return hit;
    throw new Error(`${name} was not found on this machine.`);
  }

  const env = augmentedPathEnv();
  const tried: string[] = [];

  for (const raw of candidates) {
    const candidate = raw?.trim();
    if (!candidate) continue;
    tried.push(candidate);

    if (candidate.includes('/') || candidate.includes('\\')) {
      if (existsSync(candidate)) {
        cache.set(key, candidate);
        return candidate;
      }
      continue;
    }

    const found = which(candidate, env);
    if (found) {
      cache.set(key, found);
      return found;
    }
  }

  cache.set(key, null);
  throw new Error(
    `${name} not found (tried: ${tried.join(', ')}). ` +
      `Install ${name} or set an absolute path via environment variable.`,
  );
}

export function resolvePython(): string {
  return resolveCommand('Python', [
    process.env.PYTHON_PATH,
    process.env.PYTHON_EXECUTABLE,
    'python3',
    'python',
    '/usr/bin/python3',
    '/opt/homebrew/bin/python3',
    '/usr/local/bin/python3',
    process.platform === 'win32' ? 'C:\\Python312\\python.exe' : null,
    process.platform === 'win32' ? 'C:\\Python311\\python.exe' : null,
  ]);
}

export function resolveNode(): string {
  return resolveCommand('Node.js', [
    process.env.NODE_PATH,
    process.execPath,
    'node',
    '/usr/local/bin/node',
    '/opt/homebrew/bin/node',
  ]);
}
