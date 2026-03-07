import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 font-mono text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <span className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">{language}</span>
        <button
          onClick={handleCopy}
          className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-zinc-100"
          title="Copy code"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto max-h-[500px] overflow-y-auto text-zinc-300 leading-relaxed scrollbar-thin scrollbar-thumb-zinc-800">
        <code>{code}</code>
      </pre>
    </div>
  );
};
