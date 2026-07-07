import { ExtensionCatalogEntry, ExtensionStateMap } from './types';

export const EXTENSION_CATALOG: ExtensionCatalogEntry[] = [
  { id: 'runner-core', name: 'Code Runner Core', description: 'Core run orchestration and runtime routing.', category: 'runner', downloadPath: '/extensions/runner-core.js', runnerMode: 'none' },
  { id: 'runner-html-preview', name: 'HTML Preview Runner', description: 'Render HTML in live iframe preview.', category: 'runner', downloadPath: '/extensions/runner-html-preview.js', runnerMode: 'browser', languages: ['html'] },
  { id: 'runner-css-preview', name: 'CSS Preview Runner', description: 'Render CSS in sandbox preview document.', category: 'runner', downloadPath: '/extensions/runner-css-preview.js', runnerMode: 'browser', languages: ['css', 'sass', 'less'] },
  { id: 'runner-javascript-browser', name: 'JavaScript Browser Runner', description: 'Run JavaScript in browser sandboxed function context.', category: 'runner', downloadPath: '/extensions/runner-javascript-browser.js', runnerMode: 'browser', languages: ['javascript', 'react', 'vue', 'svelte'] },
  { id: 'runner-typescript-lite', name: 'TypeScript Lite Runner', description: 'Run TypeScript with lightweight transpile fallback for medium files.', category: 'runner', downloadPath: '/extensions/runner-typescript-lite.js', runnerMode: 'browser', languages: ['typescript', 'angular'] },
  { id: 'runner-python-pyodide', name: 'Python Pyodide Runner', description: 'Run Python offline via Pyodide in browser.', category: 'runner', downloadPath: '/extensions/runner-python-pyodide.js', runnerMode: 'browser', languages: ['python'] },
  { id: 'runner-json-validator', name: 'JSON Validator Runner', description: 'Validate and pretty-print JSON quickly.', category: 'runner', downloadPath: '/extensions/runner-json-validator.js', runnerMode: 'browser', languages: ['json'] },
  { id: 'runner-markdown-preview', name: 'Markdown Preview Runner', description: 'Convert Markdown to preview HTML.', category: 'runner', downloadPath: '/extensions/runner-markdown-preview.js', runnerMode: 'browser', languages: ['markdown'] },
  { id: 'runner-yaml-check', name: 'YAML Check Runner', description: 'Basic YAML structure validation.', category: 'runner', downloadPath: '/extensions/runner-yaml-check.js', runnerMode: 'browser', languages: ['yaml'] },
  { id: 'runner-xml-check', name: 'XML Check Runner', description: 'Validate XML using browser parser.', category: 'runner', downloadPath: '/extensions/runner-xml-check.js', runnerMode: 'browser', languages: ['xml'] },
  { id: 'runner-sql-analyzer', name: 'SQL Analyzer Runner', description: 'Basic SQL checks and statement metrics.', category: 'runner', downloadPath: '/extensions/runner-sql-analyzer.js', runnerMode: 'browser', languages: ['sql'] },
  { id: 'runner-java', name: 'Java Runner', description: 'Compile/run Java via server runtime when available.', category: 'runner', downloadPath: '/extensions/runner-java.js', runnerMode: 'server', languages: ['java', 'kotlin'], alpinePackages: ['openjdk21'] },
  { id: 'runner-cpp', name: 'C/C++ Runner', description: 'Compile/run C and C++ via server runtime.', category: 'runner', downloadPath: '/extensions/runner-cpp.js', runnerMode: 'server', languages: ['c', 'cpp', 'objective-c'], alpinePackages: ['build-base'] },
  { id: 'runner-go', name: 'Go Runner', description: 'Execute Go code via server runtime.', category: 'runner', downloadPath: '/extensions/runner-go.js', runnerMode: 'server', languages: ['go'], alpinePackages: ['go'] },
  { id: 'runner-rust', name: 'Rust Runner', description: 'Compile/run Rust via server runtime.', category: 'runner', downloadPath: '/extensions/runner-rust.js', runnerMode: 'server', languages: ['rust'], alpinePackages: ['rust', 'cargo'] },
  { id: 'runner-swift', name: 'Swift Runner', description: 'Compile/run Swift via server runtime.', category: 'runner', downloadPath: '/extensions/runner-swift.js', runnerMode: 'server', languages: ['swift'] },
  { id: 'runner-php', name: 'PHP Runner', description: 'Execute PHP via server runtime.', category: 'runner', downloadPath: '/extensions/runner-php.js', runnerMode: 'server', languages: ['php'], alpinePackages: ['php83'] },
  { id: 'runner-ruby', name: 'Ruby Runner', description: 'Execute Ruby via server runtime.', category: 'runner', downloadPath: '/extensions/runner-ruby.js', runnerMode: 'server', languages: ['ruby', 'perl'], alpinePackages: ['ruby'] },
  { id: 'runner-shell', name: 'Shell Runner', description: 'Run shell/powershell scripts via server shell.', category: 'runner', downloadPath: '/extensions/runner-shell.js', runnerMode: 'server', languages: ['shell', 'powershell'] },
  { id: 'theme-vscode-dark', name: 'VS Code Dark Theme', description: 'Dark editor and workbench inspired theme.', category: 'theme', downloadPath: '/extensions/theme-vscode-dark.js' },
  { id: 'theme-vscode-light', name: 'VS Code Light Theme', description: 'Light editor and workbench inspired theme.', category: 'theme', downloadPath: '/extensions/theme-vscode-light.js' },
  { id: 'theme-oceanic', name: 'Oceanic Theme', description: 'Blue tinted theme pack for editor/workbench.', category: 'theme', downloadPath: '/extensions/theme-oceanic.js' },
  { id: 'ai-agent', name: 'Velo AI Agent', description: 'Multi-file AI agent actions (create/update/rename/delete).', category: 'ai', downloadPath: '/extensions/ai-agent.js' },
  { id: 'ai-chat-assistant', name: 'AI Chat Assistant', description: 'Conversational coding helper panel.', category: 'ai', downloadPath: '/extensions/ai-chat-assistant.js' },
  { id: 'ai-gemini-assistant', name: 'Gemini Style Assistant', description: 'Gemini-like prompt style presets.', category: 'ai', downloadPath: '/extensions/ai-gemini-assistant.js' },
  { id: 'ai-chatgpt-assistant', name: 'ChatGPT Style Assistant', description: 'ChatGPT-like prompt style presets.', category: 'ai', downloadPath: '/extensions/ai-chatgpt-assistant.js' },
  { id: 'terminal-tools', name: 'Terminal Tools', description: 'Shell history, presets, and quick controls.', category: 'tools', downloadPath: '/extensions/terminal-tools.js' },
  { id: 'workspace-importer', name: 'Workspace Importer', description: 'Import local files/folders into projects.', category: 'tools', downloadPath: '/extensions/workspace-importer.js' },
  { id: 'command-pack', name: 'Command Pack', description: 'Extra command palette shortcuts and flows.', category: 'tools', downloadPath: '/extensions/command-pack.js' },
];

export const DEFAULT_EXTENSION_STATE: ExtensionStateMap = {
  'runner-core': { installed: true, enabled: true, downloaded: true },
  'runner-html-preview': { installed: true, enabled: true, downloaded: true },
  'runner-css-preview': { installed: true, enabled: true, downloaded: true },
  'runner-javascript-browser': { installed: true, enabled: true, downloaded: true },
  'runner-typescript-lite': { installed: true, enabled: true, downloaded: true },
  'runner-python-pyodide': { installed: true, enabled: true, downloaded: true },
  'runner-json-validator': { installed: true, enabled: true, downloaded: true },
  'runner-markdown-preview': { installed: true, enabled: true, downloaded: true },
  'runner-yaml-check': { installed: true, enabled: true, downloaded: true },
  'runner-xml-check': { installed: true, enabled: true, downloaded: true },
  'runner-sql-analyzer': { installed: true, enabled: true, downloaded: true },
  'runner-java': { installed: false, enabled: false, downloaded: false },
  'runner-cpp': { installed: false, enabled: false, downloaded: false },
  'runner-go': { installed: false, enabled: false, downloaded: false },
  'runner-rust': { installed: false, enabled: false, downloaded: false },
  'runner-swift': { installed: false, enabled: false, downloaded: false },
  'runner-php': { installed: false, enabled: false, downloaded: false },
  'runner-ruby': { installed: false, enabled: false, downloaded: false },
  'runner-shell': { installed: true, enabled: true, downloaded: true },
  'theme-vscode-dark': { installed: true, enabled: true, downloaded: true },
  'theme-vscode-light': { installed: true, enabled: false, downloaded: true },
  'theme-oceanic': { installed: false, enabled: false, downloaded: false },
  'ai-agent': { installed: true, enabled: true, downloaded: true },
  'ai-chat-assistant': { installed: true, enabled: true, downloaded: true },
  'ai-gemini-assistant': { installed: false, enabled: false, downloaded: false },
  'ai-chatgpt-assistant': { installed: false, enabled: false, downloaded: false },
  'terminal-tools': { installed: true, enabled: true, downloaded: true },
  'workspace-importer': { installed: true, enabled: true, downloaded: true },
  'command-pack': { installed: true, enabled: true, downloaded: true },
};

export const getRunnerExtensionIdForLanguage = (language: string) => {
  const normalized = (language || '').toLowerCase();
  const match = EXTENSION_CATALOG.find(
    entry => entry.category === 'runner' && entry.languages?.includes(normalized)
  );
  return match?.id || 'runner-core';
};
