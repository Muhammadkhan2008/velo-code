type BrowserRunInput = {
  language: string;
  code: string;
  filePath?: string;
};

export type BrowserRunResult = {
  handled: boolean;
  output: string[];
  previewDocument?: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const markdownToHtml = (markdown: string) => {
  const lines = markdown.replace(/\r/g, '').split('\n');
  return lines
    .map((line) => {
      if (line.startsWith('### ')) return `<h3>${escapeHtml(line.slice(4))}</h3>`;
      if (line.startsWith('## ')) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
      if (line.startsWith('# ')) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
      if (line.startsWith('- ')) return `<li>${escapeHtml(line.slice(2))}</li>`;
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join('\n')
    .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
};

const stripTypeScriptTypes = (source: string) => {
  // Lightweight fallback transpiler for medium-size snippets.
  return source
    .replace(/interface\s+\w+\s*{[\s\S]*?}\s*/g, '')
    .replace(/type\s+\w+\s*=\s*[^;]+;/g, '')
    .replace(/:\s*[A-Za-z0-9_<>\[\]\|&?, ]+(?=[=;,)])/g, '')
    .replace(/ as\s+[A-Za-z0-9_<>\[\]\|&?, ]+/g, '');
};

const validateYamlLite = (source: string) => {
  const lines = source.replace(/\r/g, '').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('- ')) continue;
    if (!trimmed.includes(':')) {
      throw new Error(`Invalid YAML line: "${trimmed}"`);
    }
  }
};

const validateSqlLite = (source: string) => {
  const statements = source
    .split(';')
    .map((stmt) => stmt.trim())
    .filter(Boolean);
  if (statements.length === 0) {
    throw new Error('No SQL statement found.');
  }
  return statements.length;
};

declare global {
  interface Window {
    loadPyodide?: () => Promise<any>;
    pyodideInstance?: any;
  }
}

export const runInBrowser = async ({ language, code }: BrowserRunInput): Promise<BrowserRunResult> => {
  const normalized = language.toLowerCase();

  if (normalized === 'html') {
    return {
      handled: true,
      output: ['> HTML preview ready.'],
      previewDocument: code,
    };
  }

  if (normalized === 'css' || normalized === 'sass' || normalized === 'less') {
    return {
      handled: true,
      output: ['> CSS preview generated with demo markup.'],
      previewDocument: `<!doctype html><html><head><style>${code}</style></head><body><main><h1>CSS Preview</h1><p>Edit styles and run again.</p><button>Button</button></main></body></html>`,
    };
  }

  if (normalized === 'markdown') {
    return {
      handled: true,
      output: ['> Markdown preview generated.'],
      previewDocument: `<!doctype html><html><head><style>body{font-family:Segoe UI,Arial,sans-serif;padding:20px;line-height:1.5}h1,h2,h3{margin-top:1em}</style></head><body>${markdownToHtml(code)}</body></html>`,
    };
  }

  if (normalized === 'javascript' || normalized === 'react' || normalized === 'vue' || normalized === 'svelte') {
    const logs: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    try {
      console.log = (...args: unknown[]) => logs.push(args.map(arg => String(arg)).join(' '));
      console.error = (...args: unknown[]) => logs.push(`Error: ${args.map(arg => String(arg)).join(' ')}`);
      new Function(code)();
      if (logs.length === 0) logs.push('> Script executed successfully.');
      return { handled: true, output: logs };
    } catch (error: any) {
      return { handled: true, output: [`Error: ${error.message || 'JavaScript execution failed.'}`] };
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  }

  if (normalized === 'typescript' || normalized === 'angular') {
    try {
      const jsSource = stripTypeScriptTypes(code);
      const logs: string[] = [];
      const originalLog = console.log;
      const originalError = console.error;
      console.log = (...args: unknown[]) => logs.push(args.map(arg => String(arg)).join(' '));
      console.error = (...args: unknown[]) => logs.push(`Error: ${args.map(arg => String(arg)).join(' ')}`);
      new Function(jsSource)();
      if (logs.length === 0) logs.push('> TypeScript (lite transpile) executed.');
      return { handled: true, output: logs };
    } catch (error: any) {
      return { handled: true, output: [`Error: ${error.message || 'TypeScript execution failed.'}`] };
    }
  }

  if (normalized === 'python') {
    try {
      if (!window.loadPyodide) {
        return { handled: true, output: ['Error: Pyodide runtime not loaded yet.'] };
      }
      if (!window.pyodideInstance) {
        window.pyodideInstance = await window.loadPyodide();
      }
      const logs: string[] = [];
      window.pyodideInstance.setStdout({ batched: (message: string) => logs.push(message) });
      await window.pyodideInstance.runPythonAsync(code);
      if (logs.length === 0) logs.push('> Python executed successfully.');
      return { handled: true, output: logs };
    } catch (error: any) {
      return { handled: true, output: [`Error: ${error.message || 'Python execution failed.'}`] };
    }
  }

  if (normalized === 'json') {
    try {
      const parsed = JSON.parse(code);
      return { handled: true, output: ['> JSON valid.', JSON.stringify(parsed, null, 2)] };
    } catch (error: any) {
      return { handled: true, output: [`Error: Invalid JSON - ${error.message}`] };
    }
  }

  if (normalized === 'yaml') {
    try {
      validateYamlLite(code);
      return { handled: true, output: ['> YAML basic structure looks valid.'] };
    } catch (error: any) {
      return { handled: true, output: [`Error: ${error.message || 'YAML validation failed.'}`] };
    }
  }

  if (normalized === 'xml') {
    const parsed = new DOMParser().parseFromString(code, 'application/xml');
    const parserError = parsed.querySelector('parsererror');
    if (parserError) {
      return { handled: true, output: [`Error: ${parserError.textContent || 'Invalid XML.'}`] };
    }
    return { handled: true, output: ['> XML valid.'] };
  }

  if (normalized === 'sql') {
    try {
      const count = validateSqlLite(code);
      return { handled: true, output: [`> SQL parsed (${count} statement${count > 1 ? 's' : ''}).`] };
    } catch (error: any) {
      return { handled: true, output: [`Error: ${error.message || 'SQL validation failed.'}`] };
    }
  }

  return { handled: false, output: [] };
};
