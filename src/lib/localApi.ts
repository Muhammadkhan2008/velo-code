import { Capacitor } from '@capacitor/core';
import { ensureAlpineReady, startTerminalJob, pollTerminalJob, removeTerminalJob } from './terminalBridge';

/**
 * On-device API layer for the Android APK.
 *
 * The web/dev version of Velo Code talks to a Node backend (server.ts).
 * Inside the APK there is no server, so this module patches window.fetch
 * and serves all /api/* routes locally:
 *   - Projects/files are stored on-device (localStorage).
 *   - /api/run executes code inside the bundled Alpine Linux (proot).
 *   - /api/ai/* calls the Gemini API directly using the key from Settings.
 */

type StoredFile = {
  id: number;
  project_id: number;
  path: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type StoredProject = {
  id: number;
  name: string;
  language: string;
  description: string;
  user_id: number;
  created_at: string;
  updated_at: string;
};

type Store = {
  nextProjectId: number;
  nextFileId: number;
  projects: StoredProject[];
  files: StoredFile[];
};

const STORE_KEY = 'velo-local-store-v1';

const now = () => new Date().toISOString();

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    // fall through to fresh store
  }
  return { nextProjectId: 1, nextFileId: 1, projects: [], files: [] };
}

function saveStore(store: Store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

const TEMPLATES: Record<string, { fileName: string; content: string }> = {
  javascript: { fileName: 'index.js', content: "console.log('Hello JavaScript');" },
  typescript: { fileName: 'index.ts', content: "const msg: string = 'Hello TypeScript';\nconsole.log(msg);" },
  react: { fileName: 'App.jsx', content: 'export default function App() {\n  return <h1>Hello React</h1>;\n}' },
  python: { fileName: 'main.py', content: "def main():\n    print('Hello Python')\n\nif __name__ == '__main__':\n    main()" },
  html: { fileName: 'index.html', content: '<!DOCTYPE html>\n<html>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>' },
  css: { fileName: 'styles.css', content: 'body {\n  margin: 0;\n  font-family: system-ui;\n}' },
  java: { fileName: 'Main.java', content: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello Java");\n  }\n}' },
  cpp: { fileName: 'main.cpp', content: '#include <iostream>\n\nint main() {\n  std::cout << "Hello C++" << std::endl;\n  return 0;\n}' },
  c: { fileName: 'main.c', content: '#include <stdio.h>\n\nint main(void) {\n  printf("Hello C\\n");\n  return 0;\n}' },
  go: { fileName: 'main.go', content: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello Go")\n}' },
  rust: { fileName: 'main.rs', content: 'fn main() {\n    println!("Hello Rust");\n}' },
  php: { fileName: 'index.php', content: "<?php\necho 'Hello PHP';" },
  ruby: { fileName: 'main.rb', content: "puts 'Hello Ruby'" },
  shell: { fileName: 'script.sh', content: '#!/bin/sh\necho "Hello shell"' },
  sql: { fileName: 'query.sql', content: 'SELECT 1;' },
  json: { fileName: 'data.json', content: '{\n  "name": "app"\n}' },
  markdown: { fileName: 'README.md', content: '# New Project' },
  yaml: { fileName: 'config.yaml', content: 'name: app\nversion: 1.0.0' },
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Runtimes runnable inside Alpine, with the busybox/apk command + install hint. */
const ALPINE_RUNNERS: Record<string, { ext: string; run: string; pkg: string | null }> = {
  shell: { ext: 'sh', run: 'sh', pkg: null },
  javascript: { ext: 'js', run: 'node', pkg: 'nodejs' },
  typescript: { ext: 'ts', run: 'npx --yes tsx', pkg: 'nodejs npm' },
  python: { ext: 'py', run: 'python3', pkg: 'python3' },
  php: { ext: 'php', run: 'php', pkg: 'php' },
  ruby: { ext: 'rb', run: 'ruby', pkg: 'ruby' },
};

const EXT_LANGUAGE: Record<string, string> = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', py: 'python', sh: 'shell', bash: 'shell',
  php: 'php', rb: 'ruby', html: 'html', htm: 'html',
  css: 'css', json: 'json', md: 'markdown', yaml: 'yaml', yml: 'yaml',
};

function normalizeLanguage(language: unknown, filePath: unknown): string {
  const fromPath = typeof filePath === 'string' ? EXT_LANGUAGE[filePath.split('.').pop()?.toLowerCase() ?? ''] : undefined;
  const fromLang = typeof language === 'string' ? language.toLowerCase() : undefined;
  return fromPath || fromLang || 'javascript';
}

async function runInAlpine(code: string, language: string): Promise<string[]> {
  const runner = ALPINE_RUNNERS[language];
  if (!runner) {
    return [
      `${language} cannot be executed on-device yet.`,
      'Open the Alpine terminal and install a toolchain with: apk add <package>',
    ];
  }

  const output: string[] = [];
  await ensureAlpineReady(line => output.push(line));

  const scriptPath = `/tmp/velo-run.${runner.ext}`;
  const heredoc = `cat > ${scriptPath} <<'VELO_RUN_EOF'\n${code}\nVELO_RUN_EOF`;
  const check = runner.pkg
    ? `command -v ${runner.run.split(' ')[0]} >/dev/null 2>&1 || { echo "Error: '${runner.run.split(' ')[0]}' not installed. Run: apk add ${runner.pkg}"; exit 127; }`
    : 'true';
  const command = `${heredoc}\n${check} && ${runner.run} ${scriptPath}`;

  const jobId = await startTerminalJob(command);
  const startedAt = Date.now();
  // Poll until the job finishes (30s cap).
  for (;;) {
    const state = await pollTerminalJob(jobId);
    if (!state) break;
    if (state.done) {
      output.push(...state.output);
      if (state.code !== null && state.code !== 0) output.push(`[exit code ${state.code}]`);
      removeTerminalJob(jobId).catch(() => undefined);
      break;
    }
    if (Date.now() - startedAt > 30_000) {
      output.push('Error: execution timed out after 30s.');
      removeTerminalJob(jobId).catch(() => undefined);
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return output.length > 0 ? output : ['(no output)'];
}

async function handleLocalApi(url: URL, init: RequestInit | undefined): Promise<Response | null> {
  const method = (init?.method || 'GET').toUpperCase();
  const path = url.pathname;
  const body = typeof init?.body === 'string' && init.body.length > 0 ? JSON.parse(init.body) : {};
  const store = loadStore();

  // ---- Projects ----
  if (path === '/api/projects' && method === 'GET') {
    const sorted = [...store.projects].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return jsonResponse(sorted);
  }
  if (path === '/api/projects' && method === 'POST') {
    const { name, language, description } = body;
    const project: StoredProject = {
      id: store.nextProjectId++,
      name: String(name ?? 'Untitled'),
      language: String(language ?? 'javascript'),
      description: String(description ?? ''),
      user_id: 1,
      created_at: now(),
      updated_at: now(),
    };
    store.projects.push(project);
    const template = TEMPLATES[project.language.toLowerCase()] || { fileName: 'index.js', content: '// Start coding...' };
    store.files.push({
      id: store.nextFileId++,
      project_id: project.id,
      path: template.fileName,
      content: template.content,
      created_at: now(),
      updated_at: now(),
    });
    saveStore(store);
    return jsonResponse(project);
  }

  const projectFilesMatch = path.match(/^\/api\/projects\/(\d+)\/files$/);
  if (projectFilesMatch && method === 'GET') {
    const projectId = Number(projectFilesMatch[1]);
    return jsonResponse(store.files.filter(f => f.project_id === projectId));
  }

  // ---- Files ----
  if (path === '/api/files' && method === 'POST') {
    const { projectId, path: filePath, content } = body;
    const normalizedPath = typeof filePath === 'string' ? filePath.trim() : '';
    if (!projectId || !normalizedPath) {
      return jsonResponse({ error: 'projectId and path are required' }, 400);
    }
    const existing = store.files.find(f => f.project_id === Number(projectId) && f.path === normalizedPath);
    let saved: StoredFile;
    if (existing) {
      existing.content = String(content ?? '');
      existing.updated_at = now();
      saved = existing;
    } else {
      saved = {
        id: store.nextFileId++,
        project_id: Number(projectId),
        path: normalizedPath,
        content: String(content ?? ''),
        created_at: now(),
        updated_at: now(),
      };
      store.files.push(saved);
    }
    const project = store.projects.find(p => p.id === Number(projectId));
    if (project) project.updated_at = now();
    saveStore(store);
    return jsonResponse({ success: true, created: !existing, file: saved });
  }

  const fileMatch = path.match(/^\/api\/files\/(\d+)$/);
  if (fileMatch && method === 'PUT') {
    const fileId = Number(fileMatch[1]);
    const nextPath = typeof body.path === 'string' ? body.path.trim() : '';
    if (!nextPath) return jsonResponse({ error: 'path is required' }, 400);
    const file = store.files.find(f => f.id === fileId);
    if (!file) return jsonResponse({ error: 'File not found' }, 404);
    const conflict = store.files.find(f => f.project_id === file.project_id && f.path === nextPath && f.id !== fileId);
    if (conflict) return jsonResponse({ error: 'A file with this path already exists' }, 409);
    file.path = nextPath;
    file.updated_at = now();
    saveStore(store);
    return jsonResponse({ success: true, file });
  }
  if (fileMatch && method === 'DELETE') {
    const fileId = Number(fileMatch[1]);
    const index = store.files.findIndex(f => f.id === fileId);
    if (index === -1) return jsonResponse({ error: 'File not found' }, 404);
    store.files.splice(index, 1);
    saveStore(store);
    return jsonResponse({ success: true, fileId });
  }

  // ---- Run (executes inside Alpine Linux via proot) ----
  if (path === '/api/run' && method === 'POST') {
    const { code, language, filePath } = body;
    if (typeof code !== 'string') {
      return jsonResponse({ output: ['Error: code must be a string.'] });
    }
    const lang = normalizeLanguage(language, filePath);
    if (lang === 'html') {
      return jsonResponse({ output: ['Use Preview mode for HTML rendering (Run toggles Preview in editor).'] });
    }
    if (lang === 'css' || lang === 'json' || lang === 'markdown' || lang === 'yaml') {
      return jsonResponse({ output: [`${lang.toUpperCase()} is not directly executable. Open preview or use the terminal.`] });
    }
    try {
      const output = await runInAlpine(code, lang);
      return jsonResponse({ output });
    } catch (error: any) {
      return jsonResponse({ output: [`Error: ${error?.message || 'execution failed'}`] });
    }
  }

  // ---- AI (calls Gemini directly using the key from Settings) ----
  if (path.startsWith('/api/ai/')) {
    return handleLocalAi(path, body);
  }

  return null;
}

const SETTINGS_KEY = 'velo.ide.settings';
const GEMINI_MODEL = 'gemini-2.0-flash';

function getGeminiApiKey(): string {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.geminiApiKey === 'string') return parsed.geminiApiKey.trim();
    }
  } catch {
    // corrupted settings, treat as no key
  }
  return '';
}

async function callGemini(prompt: string, apiKey: string, jsonMode = false): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        ...(jsonMode ? { generationConfig: { responseMimeType: 'application/json' } } : {}),
      }),
    },
  );
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error?.message || `Gemini request failed (${res.status})`);
  }
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    return parts.map((part: any) => (typeof part?.text === 'string' ? part.text : '')).join('');
  }
  return '';
}

const normalizeJsonText = (text: string) =>
  text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

async function handleLocalAi(path: string, body: any): Promise<Response> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return jsonResponse({
      error: 'AI needs a Gemini API key. Open Settings and paste your key (get one free at aistudio.google.com).',
    }, 503);
  }

  try {
    if (path === '/api/ai/complete') {
      const { code, language, context } = body;
      const prompt = context
        ? `You are an expert coding assistant.\nContext: ${context}\nCode:\n\`\`\`${language}\n${code}\n\`\`\`\nAnswer the user's question or provide the requested code. Keep it concise.`
        : `Complete the following ${language} code. Return ONLY the code completion, no markdown, no explanations.\nCode:\n${code}`;
      const text = await callGemini(prompt, apiKey, false);
      return jsonResponse({ completion: text });
    }

    if (path === '/api/ai/lint') {
      const { code, language } = body;
      const prompt = `Analyze the following ${language} code for errors, bugs, or improvements.
Return a JSON array of objects with the following structure:
[
  {
    "line": <line_number_1_indexed>,
    "severity": "error" | "warning" | "info",
    "message": "<description_of_issue>",
    "fix": "<suggested_replacement_for_the_ENTIRE_line>"
  }
]
If there are no issues, return an empty array [].
Return ONLY valid JSON, no markdown formatting like \`\`\`json.

Code:
${code}`;
      const text = await callGemini(prompt, apiKey, true);
      let diagnostics: any[] = [];
      try {
        diagnostics = JSON.parse(normalizeJsonText(text || '[]'));
      } catch {
        diagnostics = [];
      }
      return jsonResponse({ diagnostics });
    }

    if (path === '/api/ai/agent') {
      const { message, project, files, activeFilePath } = body;
      if (typeof message !== 'string' || !message.trim()) {
        return jsonResponse({ error: 'message is required' }, 400);
      }
      const safeFiles = (Array.isArray(files) ? files.slice(0, 60) : []).map((file: any) => ({
        path: typeof file?.path === 'string' ? file.path : '',
        content: typeof file?.content === 'string' ? file.content.slice(0, 12000) : '',
      }));
      const prompt = `You are a coding agent for an in-browser IDE.
Return ONLY valid JSON with this exact schema:
{
  "reply": "short user-facing summary",
  "actions": [
    {"type":"create_file","path":"path.ext","content":"FULL FILE CONTENT"},
    {"type":"update_file","path":"path.ext","content":"FULL FILE CONTENT"},
    {"type":"rename_file","path":"old.ext","newPath":"new.ext"},
    {"type":"delete_file","path":"path.ext"},
    {"type":"open_file","path":"path.ext"}
  ]
}

Rules:
- Use actions only when needed by the request.
- If user asks only explanation, keep actions [].
- Use FULL file content in create/update actions (not patch/diff).
- Keep paths relative (no absolute paths).
- Prefer minimal number of actions.

Project:
- name: ${typeof project?.name === 'string' ? project.name : 'Project'}
- language: ${typeof project?.language === 'string' ? project.language : 'javascript'}
- activeFilePath: ${typeof activeFilePath === 'string' ? activeFilePath : 'none'}

Files JSON:
${JSON.stringify(safeFiles)}

User message:
${message}`;
      const text = await callGemini(prompt, apiKey, true);
      let payload: any;
      try {
        payload = JSON.parse(normalizeJsonText(text || ''));
      } catch {
        return jsonResponse({ reply: text?.trim() || 'I could not generate a valid plan right now.', actions: [] });
      }
      const reply = typeof payload?.reply === 'string' ? payload.reply.trim() : 'Done. I prepared the requested changes.';
      const actions = (Array.isArray(payload?.actions) ? payload.actions : []).slice(0, 12);
      return jsonResponse({ reply, actions });
    }

    return jsonResponse({ error: 'Unknown AI route' }, 404);
  } catch (error: any) {
    return jsonResponse({ error: error?.message || 'AI request failed' }, 500);
  }
}

/**
 * Patches window.fetch to serve /api/* locally when running inside the
 * native Android app. Terminal routes are excluded — terminalBridge talks
 * to the VeloTerminal plugin directly on native.
 */
export function installLocalApi() {
  if (!Capacitor.isNativePlatform()) return;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (rawUrl.startsWith('/api/') && !rawUrl.startsWith('/api/terminal/')) {
      const url = new URL(rawUrl, 'http://localhost');
      try {
        const handled = await handleLocalApi(url, init);
        if (handled) return handled;
      } catch (error: any) {
        return jsonResponse({ error: error?.message || 'Local API error' }, 500);
      }
    }
    return originalFetch(input as RequestInfo, init);
  };
}
