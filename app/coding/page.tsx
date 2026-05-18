'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CodeEditor } from '@/components/coding/code-editor';

const LANGUAGES = [
  { id: 'python', label: 'Python', stub: '# Write your solution\nprint("Hello PrepIndia")' },
  { id: 'java', label: 'Java', stub: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello");\n  }\n}' },
  { id: 'c', label: 'C', stub: '#include <stdio.h>\nint main() {\n  printf("Hello\\n");\n  return 0;\n}' },
] as const;

export default function CodingLabPage() {
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]['id']>('python');
  const [code, setCode] = useState<string>(LANGUAGES[0].stub);
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState<string | null>(null);
  const [meta, setMeta] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const onLanguageChange = (value: string) => {
    const lang = LANGUAGES.find((l) => l.id === value) ?? LANGUAGES[0];
    setLanguage(lang.id);
    setCode(lang.stub);
    setOutput(null);
    setMeta(null);
  };

  const runCode = async () => {
    setRunning(true);
    setOutput(null);
    setMeta(null);
    try {
      const res = await fetch('/api/v2/coding/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, sourceCode: code, stdin }),
      });
      const data = (await res.json()) as {
        stdout?: string;
        stderr?: string;
        error?: string;
        runtimeMs?: number;
        memoryKb?: number | null;
        engine?: string;
        exitCode?: number;
      };
      if (!res.ok) {
        setOutput(data.error ?? 'Run failed');
        return;
      }
      setMeta(
        [
          data.engine && `Engine: ${data.engine}`,
          data.runtimeMs !== undefined && `Time: ${data.runtimeMs}ms`,
          data.memoryKb != null && `Memory: ${data.memoryKb}KB`,
          data.exitCode !== undefined && `Exit: ${data.exitCode}`,
        ]
          .filter(Boolean)
          .join(' · '),
      );
      setOutput(
        [data.stdout && `stdout:\n${data.stdout}`, data.stderr && `stderr:\n${data.stderr}`]
          .filter(Boolean)
          .join('\n\n') || '(no output)',
      );
    } catch {
      setOutput('Run failed. Check network or execution service.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="app-page-header shrink-0">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary">V2 · Coding</p>
            <h1 className="text-xl font-bold text-foreground">Coding Lab</h1>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/practice">← Practice arena</Link>
          </Button>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 grid lg:grid-cols-2 gap-4">
        <Card className="p-4 lux-surface flex flex-col gap-3 min-h-[480px]">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={language} onValueChange={onLanguageChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => void runCode()} disabled={running}>
              {running ? 'Running…' : 'Run'}
            </Button>
          </div>
          <CodeEditor language={language} value={code} onChange={setCode} height="380px" />
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-4 lux-surface">
            <h2 className="text-sm font-medium text-foreground mb-2">Custom input</h2>
            <Textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              rows={4}
              className="font-mono text-sm bg-background/80"
              placeholder="stdin (optional)"
            />
          </Card>
          <Card className="p-4 lux-surface flex-1 min-h-[280px]">
            <h2 className="text-sm font-medium text-foreground mb-1">Output</h2>
            {meta ? <p className="text-xs text-muted-foreground mb-2">{meta}</p> : null}
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono max-h-[320px] overflow-auto">
              {output ?? 'Run your code to see output.'}
            </pre>
          </Card>
        </div>
      </div>
    </div>
  );
}
