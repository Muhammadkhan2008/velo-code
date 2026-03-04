import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import Database from 'better-sqlite3';
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from 'vite';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { randomUUID } from 'crypto';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = 3000;

type TerminalJob = {
  id: string;
  process: ChildProcessWithoutNullStreams;
  output: string[];
  done: boolean;
  code: number | null;
  startedAt: number;
};

const terminalJobs = new Map<string, TerminalJob>();
const MAX_TERMINAL_OUTPUT_LINES = 2000;

// Database setup
const db = new Database('cloud-ide.db');
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    language TEXT,
    description TEXT,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    path TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id),
    UNIQUE(project_id, path)
  );
`);

// Seed demo user
const stmt = db.prepare('INSERT OR IGNORE INTO users (username) VALUES (?)');
stmt.run('demo_user');

app.use(express.json());

// API Routes

// Get all projects
app.get('/api/projects', (req, res) => {
  try {
    const projects = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create project
app.post('/api/projects', (req, res) => {
  const { name, language, description } = req.body;
  try {
    const result = db.prepare(
      'INSERT INTO projects (name, language, description, user_id) VALUES (?, ?, ?, 1)'
    ).run(name, language, description);
    
    const projectId = result.lastInsertRowid;
    
    // Create default file based on language
    const templates: Record<string, { fileName: string; content: string }> = {
      javascript: { fileName: 'index.js', content: "console.log('Hello JavaScript');" },
      typescript: { fileName: 'index.ts', content: "const msg: string = 'Hello TypeScript';\nconsole.log(msg);" },
      react: { fileName: 'App.jsx', content: "export default function App() {\n  return <h1>Hello React</h1>;\n}" },
      python: { fileName: 'main.py', content: "def main():\n    print('Hello Python')\n\nif __name__ == '__main__':\n    main()" },
      html: { fileName: 'index.html', content: '<!DOCTYPE html>\n<html>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>' },
      css: { fileName: 'styles.css', content: "body {\n  margin: 0;\n  font-family: system-ui;\n}" },
      java: { fileName: 'Main.java', content: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello Java");\n  }\n}' },
      cpp: { fileName: 'main.cpp', content: '#include <iostream>\n\nint main() {\n  std::cout << "Hello C++" << std::endl;\n  return 0;\n}' },
      c: { fileName: 'main.c', content: '#include <stdio.h>\n\nint main(void) {\n  printf("Hello C\\n");\n  return 0;\n}' },
      csharp: { fileName: 'Program.cs', content: 'using System;\n\nclass Program {\n  static void Main() {\n    Console.WriteLine("Hello C#");\n  }\n}' },
      go: { fileName: 'main.go', content: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello Go")\n}' },
      rust: { fileName: 'main.rs', content: 'fn main() {\n    println!("Hello Rust");\n}' },
      swift: { fileName: 'main.swift', content: 'import Foundation\n\nprint("Hello Swift")' },
      php: { fileName: 'index.php', content: "<?php\necho 'Hello PHP';" },
      ruby: { fileName: 'main.rb', content: "puts 'Hello Ruby'" },
      shell: { fileName: 'script.sh', content: '#!/usr/bin/env bash\necho "Hello shell"' },
      powershell: { fileName: 'script.ps1', content: 'Write-Host "Hello PowerShell"' },
      sql: { fileName: 'query.sql', content: 'SELECT 1;' },
      json: { fileName: 'data.json', content: '{\n  "name": "app"\n}' },
      markdown: { fileName: 'README.md', content: '# New Project' },
      yaml: { fileName: 'config.yaml', content: 'name: app\nversion: 1.0.0' },
      vue: { fileName: 'App.vue', content: '<template>\n  <h1>Hello Vue</h1>\n</template>' },
      angular: { fileName: 'app.component.ts', content: 'export class AppComponent {}' },
      svelte: { fileName: 'App.svelte', content: '<h1>Hello Svelte</h1>' },
      solidity: { fileName: 'Contract.sol', content: 'pragma solidity ^0.8.20;\n\ncontract Contract {}' },
    };

    const normalizedLanguage = typeof language === 'string' ? language.toLowerCase() : 'javascript';
    const selectedTemplate = templates[normalizedLanguage] || { fileName: 'index.js', content: '// Start coding...' };
    const fileName = selectedTemplate.fileName;
    const content = selectedTemplate.content;
    
    db.prepare(
      'INSERT INTO files (project_id, path, content) VALUES (?, ?, ?)'
    ).run(projectId, fileName, content);
    
    const newProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    res.json(newProject);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get project files
app.get('/api/projects/:id/files', (req, res) => {
  try {
    const files = db.prepare('SELECT * FROM files WHERE project_id = ?').all(req.params.id);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Save file
app.post('/api/files', (req, res) => {
  const { projectId, path, content } = req.body;
  const normalizedPath = typeof path === 'string' ? path.trim() : '';
  try {
    if (!projectId || !normalizedPath) {
      return res.status(400).json({ error: 'projectId and path are required' });
    }

    // Check if file exists
    const existing = db.prepare('SELECT id FROM files WHERE project_id = ? AND path = ?').get(projectId, normalizedPath) as { id: number } | undefined;
    
    if (existing) {
      db.prepare('UPDATE files SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(content ?? '', existing.id);
    } else {
      db.prepare('INSERT INTO files (project_id, path, content) VALUES (?, ?, ?)').run(projectId, normalizedPath, content ?? '');
    }
    
    db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(projectId);

    const savedFile = db
      .prepare('SELECT * FROM files WHERE project_id = ? AND path = ?')
      .get(projectId, normalizedPath);
    
    res.json({ success: true, created: !existing, file: savedFile });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// Rename/update file metadata
app.put('/api/files/:id', (req, res) => {
  const fileId = Number(req.params.id);
  const { path } = req.body;
  const nextPath = typeof path === 'string' ? path.trim() : '';

  if (!Number.isFinite(fileId) || fileId <= 0) {
    return res.status(400).json({ error: 'Invalid file id' });
  }
  if (!nextPath) {
    return res.status(400).json({ error: 'path is required' });
  }

  try {
    const existingFile = db.prepare('SELECT id, project_id, path FROM files WHERE id = ?').get(fileId) as
      | { id: number; project_id: number; path: string }
      | undefined;

    if (!existingFile) {
      return res.status(404).json({ error: 'File not found' });
    }

    const conflictingFile = db.prepare(
      'SELECT id FROM files WHERE project_id = ? AND path = ? AND id != ?'
    ).get(existingFile.project_id, nextPath, fileId) as { id: number } | undefined;

    if (conflictingFile) {
      return res.status(409).json({ error: 'A file with this path already exists' });
    }

    db.prepare(
      'UPDATE files SET path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(nextPath, fileId);
    db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(existingFile.project_id);

    const updatedFile = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId);
    res.json({ success: true, file: updatedFile });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rename file' });
  }
});

// Delete file
app.delete('/api/files/:id', (req, res) => {
  const fileId = Number(req.params.id);
  if (!Number.isFinite(fileId) || fileId <= 0) {
    return res.status(400).json({ error: 'Invalid file id' });
  }

  try {
    const existingFile = db.prepare('SELECT id, project_id FROM files WHERE id = ?').get(fileId) as
      | { id: number; project_id: number }
      | undefined;

    if (!existingFile) {
      return res.status(404).json({ error: 'File not found' });
    }

    db.prepare('DELETE FROM files WHERE id = ?').run(fileId);
    db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(existingFile.project_id);

    res.json({ success: true, fileId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

const appendTerminalOutput = (job: TerminalJob, chunk: string) => {
  const lines = chunk.replace(/\r/g, '').split('\n');
  for (const line of lines) {
    if (line.length === 0) continue;
    job.output.push(line);
  }
  if (job.output.length > MAX_TERMINAL_OUTPUT_LINES) {
    job.output = job.output.slice(job.output.length - MAX_TERMINAL_OUTPUT_LINES);
  }
};

// Start terminal command job
app.post('/api/terminal/jobs', (req, res) => {
  const { command, cwd } = req.body ?? {};
  if (typeof command !== 'string' || !command.trim()) {
    return res.status(400).json({ error: 'command is required' });
  }

  const workspaceRoot = process.cwd();
  let jobCwd = workspaceRoot;
  if (typeof cwd === 'string' && cwd.trim()) {
    const resolved = path.resolve(workspaceRoot, cwd.trim());
    if (!resolved.startsWith(workspaceRoot)) {
      return res.status(400).json({ error: 'cwd must be within project workspace' });
    }
    jobCwd = resolved;
  }

  try {
    const processHandle = spawn(command, [], {
      cwd: jobCwd,
      shell: true,
      env: process.env,
      windowsHide: true,
    }) as ChildProcessWithoutNullStreams;

    const id = randomUUID();
    const job: TerminalJob = {
      id,
      process: processHandle,
      output: [`$ ${command}`],
      done: false,
      code: null,
      startedAt: Date.now(),
    };
    terminalJobs.set(id, job);

    processHandle.stdout.on('data', (chunk: Buffer | string) => {
      appendTerminalOutput(job, String(chunk));
    });
    processHandle.stderr.on('data', (chunk: Buffer | string) => {
      appendTerminalOutput(job, `Error: ${String(chunk)}`);
    });
    processHandle.on('close', (code) => {
      job.done = true;
      job.code = code;
      appendTerminalOutput(job, `> Process exited with code ${code ?? 0}`);
    });
    processHandle.on('error', (error: Error) => {
      job.done = true;
      job.code = 1;
      appendTerminalOutput(job, `Error: ${error.message}`);
    });

    res.json({ success: true, jobId: id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to start terminal command' });
  }
});

// Poll terminal command job
app.get('/api/terminal/jobs/:id', (req, res) => {
  const job = terminalJobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Terminal job not found' });
  }
  res.json({
    id: job.id,
    output: job.output,
    done: job.done,
    code: job.code,
    startedAt: job.startedAt,
  });
});

// Stop running terminal command job
app.post('/api/terminal/jobs/:id/stop', (req, res) => {
  const job = terminalJobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Terminal job not found' });
  }
  if (!job.done) {
    job.process.kill();
    job.done = true;
    appendTerminalOutput(job, '> Process stopped by user');
  }
  res.json({ success: true, id: job.id, done: job.done });
});

// Delete terminal command job history
app.delete('/api/terminal/jobs/:id', (req, res) => {
  const job = terminalJobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Terminal job not found' });
  }
  if (!job.done) {
    job.process.kill();
  }
  terminalJobs.delete(req.params.id);
  res.json({ success: true });
});

type AIProvider = 'gemini' | 'openrouter';

const sanitizeApiKey = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.replace(/["']/g, '').trim();
};

const isInvalidApiKey = (key: string) => {
  return !key || key.length < 20 || key.includes('TODO') || key.includes('YOUR_KEY') || key.startsWith('MY_');
};

const resolveAIProvider = (): { provider: AIProvider; apiKey: string } | null => {
  const forcedProvider = String(process.env.AI_PROVIDER || 'auto').toLowerCase();
  const geminiKey = sanitizeApiKey(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY);
  const openRouterKey = sanitizeApiKey(process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY);

  if (forcedProvider === 'openrouter') {
    return isInvalidApiKey(openRouterKey) ? null : { provider: 'openrouter', apiKey: openRouterKey };
  }
  if (forcedProvider === 'gemini') {
    return isInvalidApiKey(geminiKey) ? null : { provider: 'gemini', apiKey: geminiKey };
  }

  if (!isInvalidApiKey(openRouterKey)) {
    return { provider: 'openrouter', apiKey: openRouterKey };
  }
  if (!isInvalidApiKey(geminiKey)) {
    return { provider: 'gemini', apiKey: geminiKey };
  }
  return null;
};

const generateWithGemini = async (prompt: string, apiKey: string, jsonMode = false) => {
  const ai = new GoogleGenAI({ apiKey });
  const result = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash-lite-preview-02-05",
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: jsonMode ? { responseMimeType: "application/json" } : undefined,
  });
  return result.text || '';
};

const generateWithOpenRouter = async (prompt: string, apiKey: string, jsonMode = false) => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': 'Mobile Cloud IDE',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'OpenRouter request failed');
  }

  const message = payload?.choices?.[0]?.message?.content;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) {
    return message
      .map((item: any) => item?.text || '')
      .join('');
  }
  return '';
};

const generateAIText = async (prompt: string, jsonMode = false) => {
  const resolved = resolveAIProvider();
  if (!resolved) {
    throw new Error('AI API key not configured. Set OPENROUTER_API_KEY or GEMINI_API_KEY.');
  }
  if (resolved.provider === 'openrouter') {
    return generateWithOpenRouter(prompt, resolved.apiKey, jsonMode);
  }
  return generateWithGemini(prompt, resolved.apiKey, jsonMode);
};

const normalizeJsonText = (text: string) => {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
};

type AgentAction =
  | { type: 'create_file'; path: string; content: string }
  | { type: 'update_file'; path: string; content: string }
  | { type: 'rename_file'; path: string; newPath: string }
  | { type: 'delete_file'; path: string }
  | { type: 'open_file'; path: string };

const sanitizeAgentAction = (action: any): AgentAction | null => {
  if (!action || typeof action !== 'object' || typeof action.type !== 'string') return null;
  const type = action.type.trim();
  if (type === 'create_file' || type === 'update_file') {
    if (typeof action.path !== 'string' || typeof action.content !== 'string') return null;
    const pathValue = action.path.trim();
    if (!pathValue) return null;
    return { type, path: pathValue, content: action.content };
  }
  if (type === 'rename_file') {
    if (typeof action.path !== 'string' || typeof action.newPath !== 'string') return null;
    const fromPath = action.path.trim();
    const toPath = action.newPath.trim();
    if (!fromPath || !toPath) return null;
    return { type, path: fromPath, newPath: toPath };
  }
  if (type === 'delete_file' || type === 'open_file') {
    if (typeof action.path !== 'string') return null;
    const pathValue = action.path.trim();
    if (!pathValue) return null;
    return { type, path: pathValue };
  }
  return null;
};

const extractAgentResponse = (text: string) => {
  const normalized = normalizeJsonText(text || '');
  let payload: any;
  try {
    payload = JSON.parse(normalized);
  } catch {
    return {
      reply: text?.trim() || 'I could not generate a valid plan right now.',
      actions: [] as AgentAction[],
    };
  }

  const reply = typeof payload?.reply === 'string'
    ? payload.reply.trim()
    : 'Done. I prepared the requested changes.';
  const rawActions = Array.isArray(payload?.actions) ? payload.actions : [];
  const actions = rawActions
    .map(sanitizeAgentAction)
    .filter(Boolean)
    .slice(0, 12) as AgentAction[];

  return { reply, actions };
};

// AI Completion
app.post('/api/ai/complete', async (req, res) => {
  const { code, language, context } = req.body;

  try {
    let prompt = '';
    if (context) {
      prompt = `You are an expert coding assistant.
Context: ${context}
Code:
\`\`\`${language}
${code}
\`\`\`
Answer the user's question or provide the requested code. Keep it concise.`;
    } else {
      prompt = `Complete the following ${language} code. Return ONLY the code completion, no markdown, no explanations.
Code:
${code}`;
    }

    const text = await generateAIText(prompt, false);
    res.json({ completion: text });
  } catch (error: any) {
    console.error('AI Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI Lint Endpoint
app.post('/api/ai/lint', async (req, res) => {
  const { code, language } = req.body;

  try {
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

    const text = await generateAIText(prompt, true);
    let lintResults: any[] = [];
    try {
      lintResults = JSON.parse(normalizeJsonText(text || '[]'));
    } catch (e) {
      console.error('Failed to parse lint results', text);
      lintResults = [];
    }

    res.json({ diagnostics: lintResults });
  } catch (error: any) {
    console.error('AI Lint Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI Agent Endpoint
app.post('/api/ai/agent', async (req, res) => {
  const { message, project, files, activeFilePath } = req.body ?? {};
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const projectName = typeof project?.name === 'string' ? project.name : 'Project';
  const projectLanguage = typeof project?.language === 'string' ? project.language : 'javascript';
  const safeFiles = Array.isArray(files) ? files.slice(0, 60) : [];
  const compactFiles = safeFiles.map((file: any) => ({
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
- name: ${projectName}
- language: ${projectLanguage}
- activeFilePath: ${typeof activeFilePath === 'string' ? activeFilePath : 'none'}

Files JSON:
${JSON.stringify(compactFiles)}

User message:
${message}`;

  try {
    const text = await generateAIText(prompt, true);
    const parsed = extractAgentResponse(text);
    res.json(parsed);
  } catch (error: any) {
    console.error('AI Agent Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const RUN_TIMEOUT_MS = Math.max(1000, Number(process.env.RUN_TIMEOUT_MS || 12000));
const RUN_MAX_OUTPUT_CHARS = 100_000;

type CommandSpec = {
  command: string;
  args: string[];
};

type CommandResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  notFound: boolean;
  command: string;
};

const splitLines = (value: string) => value.replace(/\r/g, '').split('\n').map(line => line.trimEnd()).filter(Boolean);

const normalizeLanguage = (language: unknown, filePath: unknown) => {
  const rawLanguage = typeof language === 'string' ? language.toLowerCase().trim() : '';
  const rawPath = typeof filePath === 'string' ? filePath.toLowerCase().trim() : '';
  const extension = rawPath.includes('.') ? rawPath.split('.').pop() || '' : '';

  const byExtension: Record<string, string> = {
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    py: 'python',
    java: 'java',
    c: 'c',
    cc: 'cpp',
    cpp: 'cpp',
    cxx: 'cpp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    rb: 'ruby',
    swift: 'swift',
    sh: 'shell',
    ps1: 'powershell',
    html: 'html',
    css: 'css',
    json: 'json',
    md: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
  };

  const normalizedRaw: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    csharp: 'csharp',
    'c#': 'csharp',
    'c++': 'cpp',
    bash: 'shell',
    sh: 'shell',
    powershell: 'powershell',
    pwsh: 'powershell',
    react: 'javascript',
    vue: 'javascript',
    angular: 'typescript',
    svelte: 'javascript',
  };

  if (rawLanguage && normalizedRaw[rawLanguage]) {
    return normalizedRaw[rawLanguage];
  }
  if (rawLanguage) {
    return rawLanguage;
  }
  return byExtension[extension] || 'javascript';
};

const runCommand = (spec: CommandSpec, cwd: string): Promise<CommandResult> =>
  new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timedOut = false;
    let done = false;

    const useShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(spec.command);

    const child = spawn(spec.command, spec.args, {
      cwd,
      env: process.env,
      windowsHide: true,
      shell: useShell,
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, RUN_TIMEOUT_MS);

    const finish = (code: number | null, notFound: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      resolve({
        code,
        stdout,
        stderr,
        timedOut,
        notFound,
        command: spec.command,
      });
    };

    child.stdout.on('data', (chunk: Buffer | string) => {
      if (stdoutTruncated) return;
      stdout += String(chunk);
      if (stdout.length > RUN_MAX_OUTPUT_CHARS) {
        stdout = `${stdout.slice(0, RUN_MAX_OUTPUT_CHARS)}\n...stdout truncated...`;
        stdoutTruncated = true;
      }
    });

    child.stderr.on('data', (chunk: Buffer | string) => {
      if (stderrTruncated) return;
      stderr += String(chunk);
      if (stderr.length > RUN_MAX_OUTPUT_CHARS) {
        stderr = `${stderr.slice(0, RUN_MAX_OUTPUT_CHARS)}\n...stderr truncated...`;
        stderrTruncated = true;
      }
    });

    child.on('error', (error: NodeJS.ErrnoException) => {
      finish(null, error.code === 'ENOENT');
    });

    child.on('close', (code) => {
      finish(code, false);
    });
  });

const runWithFallback = async (specs: CommandSpec[], cwd: string) => {
  const missingCommands: string[] = [];
  let lastResult: CommandResult | null = null;

  for (const spec of specs) {
    const result = await runCommand(spec, cwd);
    lastResult = result;
    if (result.notFound) {
      missingCommands.push(spec.command);
      continue;
    }
    return { result, missingCommands };
  }

  return {
    result: lastResult || {
      code: null,
      stdout: '',
      stderr: '',
      timedOut: false,
      notFound: true,
      command: specs[0]?.command || 'unknown',
    },
    missingCommands,
  };
};

const formatCommandResult = (result: CommandResult, fallbackInstallHint?: string) => {
  const lines: string[] = [];

  if (result.notFound) {
    lines.push(`Error: Runtime command not found (${result.command}).`);
    if (fallbackInstallHint) lines.push(fallbackInstallHint);
    return lines;
  }

  if (result.stdout.trim()) {
    lines.push(...splitLines(result.stdout));
  }
  if (result.stderr.trim()) {
    const stderrLines = splitLines(result.stderr);
    const prefix = (result.code ?? 0) === 0 ? '> ' : 'Error: ';
    lines.push(...stderrLines.map(line => `${prefix}${line}`));
  }

  if (result.timedOut) {
    lines.push(`Error: Execution timed out after ${RUN_TIMEOUT_MS}ms.`);
  } else if ((result.code ?? 0) !== 0 && !result.stderr.trim()) {
    lines.push(`Error: Process exited with code ${result.code ?? 1}.`);
  } else if (!result.stdout.trim() && !result.stderr.trim()) {
    lines.push('> Program finished with no output.');
  }

  return lines;
};

const formatMissingCommands = (label: string, missingCommands: string[], installHint: string) => [
  `Error: ${label} runtime/compiler not found.`,
  `Tried: ${missingCommands.join(', ')}`,
  installHint,
];

// Code Execution Endpoint
app.post('/api/run', async (req, res) => {
  const { code, language, filePath } = req.body ?? {};
  if (typeof code !== 'string') {
    return res.status(400).json({ output: ['Error: code must be a string.'] });
  }

  const lang = normalizeLanguage(language, filePath);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'velo-run-'));

  try {
    if (lang === 'html') {
      return res.json({ output: ['Use Preview mode for HTML rendering (Run toggles Preview in editor).'] });
    }
    if (lang === 'css' || lang === 'json' || lang === 'markdown' || lang === 'yaml') {
      return res.json({ output: [`${lang.toUpperCase()} is not directly executable. Open preview or use build tools in Terminal.`] });
    }

    if (lang === 'javascript') {
      const source = path.join(tempDir, 'main.js');
      await fs.writeFile(source, code, 'utf8');
      const { result } = await runWithFallback([{ command: 'node', args: [source] }], tempDir);
      return res.json({ output: formatCommandResult(result, 'Install Node.js to execute JavaScript on server.') });
    }

    if (lang === 'typescript') {
      const source = path.join(tempDir, 'main.ts');
      await fs.writeFile(source, code, 'utf8');
      const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const tsxCommand = process.platform === 'win32' ? 'tsx.cmd' : 'tsx';
      const localTsxCli = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
      const tsCommandSpecs: CommandSpec[] = [];

      const hasLocalTsxCli = await fs.stat(localTsxCli).then(() => true).catch(() => false);
      if (hasLocalTsxCli) {
        tsCommandSpecs.push({ command: 'node', args: [localTsxCli, source] });
      }
      tsCommandSpecs.push({ command: npxCommand, args: ['--yes', 'tsx', source] });
      tsCommandSpecs.push({ command: tsxCommand, args: [source] });

      const { result, missingCommands } = await runWithFallback(tsCommandSpecs, tempDir);
      if (result.notFound) {
        return res.json({ output: formatMissingCommands('TypeScript', missingCommands, 'Install Node.js (npx) or tsx CLI.') });
      }
      return res.json({ output: formatCommandResult(result, 'Install Node.js + tsx to execute TypeScript.') });
    }

    if (lang === 'python') {
      const source = path.join(tempDir, 'main.py');
      await fs.writeFile(source, code, 'utf8');
      const { result } = await runWithFallback(
        [
          { command: 'python', args: [source] },
          { command: 'python3', args: [source] },
          { command: 'py', args: ['-3', source] },
        ],
        tempDir
      );
      return res.json({ output: formatCommandResult(result, 'Install Python 3 to execute Python code.') });
    }

    if (lang === 'php') {
      const source = path.join(tempDir, 'main.php');
      await fs.writeFile(source, code, 'utf8');
      const { result } = await runWithFallback([{ command: 'php', args: [source] }], tempDir);
      return res.json({ output: formatCommandResult(result, 'Install PHP CLI to execute PHP code.') });
    }

    if (lang === 'ruby') {
      const source = path.join(tempDir, 'main.rb');
      await fs.writeFile(source, code, 'utf8');
      const { result } = await runWithFallback([{ command: 'ruby', args: [source] }], tempDir);
      return res.json({ output: formatCommandResult(result, 'Install Ruby to execute Ruby code.') });
    }

    if (lang === 'shell') {
      const source = path.join(tempDir, 'main.sh');
      await fs.writeFile(source, code, 'utf8');
      const { result } = await runWithFallback(
        [
          { command: 'bash', args: [source] },
          { command: 'sh', args: [source] },
        ],
        tempDir
      );
      return res.json({ output: formatCommandResult(result, 'Install bash/sh (e.g., Git Bash or WSL) to execute shell scripts.') });
    }

    if (lang === 'powershell') {
      const source = path.join(tempDir, 'main.ps1');
      await fs.writeFile(source, code, 'utf8');
      const { result } = await runWithFallback(
        [
          { command: 'pwsh', args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', source] },
          { command: 'powershell', args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', source] },
        ],
        tempDir
      );
      return res.json({ output: formatCommandResult(result, 'Install PowerShell (pwsh/powershell) to execute scripts.') });
    }

    if (lang === 'c') {
      const source = path.join(tempDir, 'main.c');
      const binary = path.join(tempDir, process.platform === 'win32' ? 'main-c.exe' : 'main-c');
      await fs.writeFile(source, code, 'utf8');

      const { result: compileResult, missingCommands } = await runWithFallback(
        [
          { command: 'gcc', args: [source, '-O2', '-std=c11', '-o', binary] },
          { command: 'clang', args: [source, '-O2', '-std=c11', '-o', binary] },
        ],
        tempDir
      );

      if (compileResult.notFound) {
        return res.json({ output: formatMissingCommands('C', missingCommands, 'Install GCC/Clang to compile C code.') });
      }
      if ((compileResult.code ?? 1) !== 0) {
        return res.json({ output: formatCommandResult(compileResult, 'Install GCC/Clang to compile C code.') });
      }

      const runResult = await runCommand({ command: binary, args: [] }, tempDir);
      return res.json({ output: formatCommandResult(runResult) });
    }

    if (lang === 'cpp') {
      const source = path.join(tempDir, 'main.cpp');
      const binary = path.join(tempDir, process.platform === 'win32' ? 'main-cpp.exe' : 'main-cpp');
      await fs.writeFile(source, code, 'utf8');

      const { result: compileResult, missingCommands } = await runWithFallback(
        [
          { command: 'g++', args: [source, '-O2', '-std=c++17', '-o', binary] },
          { command: 'clang++', args: [source, '-O2', '-std=c++17', '-o', binary] },
        ],
        tempDir
      );

      if (compileResult.notFound) {
        return res.json({ output: formatMissingCommands('C++', missingCommands, 'Install g++/clang++ to compile C++ code.') });
      }
      if ((compileResult.code ?? 1) !== 0) {
        return res.json({ output: formatCommandResult(compileResult, 'Install g++/clang++ to compile C++ code.') });
      }

      const runResult = await runCommand({ command: binary, args: [] }, tempDir);
      return res.json({ output: formatCommandResult(runResult) });
    }

    if (lang === 'java') {
      const source = path.join(tempDir, 'Main.java');
      await fs.writeFile(source, code, 'utf8');

      const { result: compileResult } = await runWithFallback([{ command: 'javac', args: [source] }], tempDir);
      if (compileResult.notFound || (compileResult.code ?? 1) !== 0) {
        return res.json({
          output: formatCommandResult(
            compileResult,
            'Install Java JDK (javac + java). Your file should contain class Main with main method.'
          ),
        });
      }

      const { result: runResult } = await runWithFallback([{ command: 'java', args: ['-cp', tempDir, 'Main'] }], tempDir);
      return res.json({ output: formatCommandResult(runResult, 'Install Java runtime to run compiled class.') });
    }

    if (lang === 'go') {
      const source = path.join(tempDir, 'main.go');
      await fs.writeFile(source, code, 'utf8');
      const { result } = await runWithFallback([{ command: 'go', args: ['run', source] }], tempDir);
      return res.json({ output: formatCommandResult(result, 'Install Go toolchain to execute Go code.') });
    }

    if (lang === 'rust') {
      const source = path.join(tempDir, 'main.rs');
      const binary = path.join(tempDir, process.platform === 'win32' ? 'main-rust.exe' : 'main-rust');
      await fs.writeFile(source, code, 'utf8');

      const { result: compileResult } = await runWithFallback([{ command: 'rustc', args: [source, '-o', binary] }], tempDir);
      if (compileResult.notFound || (compileResult.code ?? 1) !== 0) {
        return res.json({ output: formatCommandResult(compileResult, 'Install Rust toolchain (rustc/cargo).') });
      }

      const runResult = await runCommand({ command: binary, args: [] }, tempDir);
      return res.json({ output: formatCommandResult(runResult) });
    }

    if (lang === 'swift') {
      const source = path.join(tempDir, 'main.swift');
      const binary = path.join(tempDir, process.platform === 'win32' ? 'main-swift.exe' : 'main-swift');
      await fs.writeFile(source, code, 'utf8');

      const { result, missingCommands } = await runWithFallback(
        [
          { command: 'swiftc', args: [source, '-o', binary] },
          { command: 'swift', args: [source] },
        ],
        tempDir
      );

      if (result.notFound) {
        return res.json({ output: formatMissingCommands('Swift', missingCommands, 'Install Swift toolchain (swift/swiftc).') });
      }

      if (result.command === 'swiftc' && (result.code ?? 1) === 0) {
        const runResult = await runCommand({ command: binary, args: [] }, tempDir);
        return res.json({ output: formatCommandResult(runResult) });
      }

      return res.json({ output: formatCommandResult(result, 'Install Swift toolchain (swift/swiftc).') });
    }

    return res.json({
      output: [
        `Execution for ${lang} is not wired yet in /api/run.`,
        'Use integrated Terminal for custom build/run commands (npm, npx, gcc, java, etc.).',
      ],
    });
  } catch (error: any) {
    return res.status(500).json({ output: [`Error: ${error.message || 'Execution failed.'}`] });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
});

// WebSocket Server for Real-time Collaboration
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', (message) => {
    // Broadcast to all clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Vite middleware for development
if (process.env.NODE_ENV !== 'production') {
  createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  }).then((vite) => {
    app.use(vite.middlewares);
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
