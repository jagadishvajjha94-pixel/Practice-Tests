'use client';

import dynamic from 'next/dynamic';

const Monaco = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type Props = {
  language: string;
  value: string;
  onChange: (value: string) => void;
  height?: string;
};

export function CodeEditor({ language, value, onChange, height = '360px' }: Props) {
  const monacoLang =
    language === 'python' ? 'python' : language === 'java' ? 'java' : language === 'c' ? 'c' : 'plaintext';

  return (
    <div className="rounded-lg border border-border overflow-hidden min-h-[280px]">
      <Monaco
        height={height}
        language={monacoLang}
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
        }}
      />
    </div>
  );
}
