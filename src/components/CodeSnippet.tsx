interface CodeSnippetProps {
  title: string;
  language: string;
  code: string;
}

export function CodeSnippet({title, language, code}: CodeSnippetProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#141419]">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#101015] px-4 py-2 text-xs text-slate-400">
        <span>{title}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide">{language}</span>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-6 text-cyan-100 sm:text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}
