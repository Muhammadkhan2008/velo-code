import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  ArrowLeft,
  Smartphone,
  Monitor,
  Apple,
  Linux,
  Shield,
  Settings, 
  Folder, 
  Play,
  Download,
  Menu, 
  X, 
  Plus, 
  Save, 
  Cpu, 
  Search,
  Code2,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  Bug,
  FilePlus,
  Pencil,
  Trash2
} from 'lucide-react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { php } from '@codemirror/lang-php';
import { rust } from '@codemirror/lang-rust';
import { sql } from '@codemirror/lang-sql';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { xml } from '@codemirror/lang-xml';
import { go } from '@codemirror/lang-go';
import { yaml } from '@codemirror/lang-yaml';
import { sass } from '@codemirror/lang-sass';
import { less } from '@codemirror/lang-less';
import { angular } from '@codemirror/lang-angular';
import { vue } from '@codemirror/lang-vue';
import { liquid } from '@codemirror/lang-liquid';
import { wast } from '@codemirror/lang-wast';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { lintGutter, setDiagnostics, Diagnostic } from '@codemirror/lint';
import { Project, File } from './types';
import { cn } from './lib/utils';
import { EditorView } from '@codemirror/view';
import { vscodeLight } from '@uiw/codemirror-theme-vscode';
import { runInBrowser } from './extensions/browserRunners';
import { EXTENSION_CATALOG, DEFAULT_EXTENSION_STATE, getRunnerExtensionIdForLanguage } from './extensions/catalog';
import { ResolvedExtensionEntry, ExtensionStateMap } from './extensions/types';

type SidebarView = 'explorer' | 'search';

interface ProjectSearchHit {
  file: File;
  lineNumber: number;
  preview: string;
}

interface QuickAction {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
  disabled?: boolean;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

type AgentAction =
  | { type: 'create_file'; path: string; content: string }
  | { type: 'update_file'; path: string; content: string }
  | { type: 'rename_file'; path: string; newPath: string }
  | { type: 'delete_file'; path: string }
  | { type: 'open_file'; path: string };

interface BoilerplateSnippet {
  id: string;
  title: string;
  language: string;
  frameworks: string[];
  content: string;
}

interface IdeSettings {
  wordWrap: boolean;
  editorFontSize: number;
  terminalFontSize: number;
  autoSave: boolean;
  defaultTerminalMode: 'console' | 'shell';
  editorTheme: 'vscode-dark' | 'vscode-light';
}

const DEFAULT_SETTINGS: IdeSettings = {
  wordWrap: false,
  editorFontSize: 14,
  terminalFontSize: 13,
  autoSave: false,
  defaultTerminalMode: 'console',
  editorTheme: 'vscode-dark',
};

const LANGUAGE_OPTIONS = [
  'javascript', 'typescript', 'python', 'html', 'css', 'java', 'cpp', 'c', 'csharp', 'kotlin',
  'swift', 'php', 'rust', 'go', 'sql', 'json', 'markdown', 'xml', 'yaml', 'sass',
  'less', 'angular', 'vue', 'react', 'svelte', 'liquid', 'wast', 'ruby', 'perl', 'lua',
  'dart', 'r', 'scala', 'elixir', 'erlang', 'shell', 'powershell', 'objective-c', 'julia', 'haskell',
  'zig', 'clojure', 'fortran', 'nim', 'groovy', 'solidity'
] as const;

const LANGUAGE_ECOSYSTEM: Record<string, { frameworks: string[]; libraries: string[] }> = {
  javascript: { frameworks: ['React', 'Vue', 'Svelte', 'Express'], libraries: ['Lodash', 'Axios', 'Zod', 'Socket.IO'] },
  typescript: { frameworks: ['Next.js', 'NestJS', 'Angular'], libraries: ['tsup', 'TypeORM', 'Prisma', 'Zod'] },
  python: { frameworks: ['FastAPI', 'Flask', 'Django'], libraries: ['NumPy', 'Pandas', 'Requests', 'Pydantic'] },
  html: { frameworks: ['Astro', '11ty'], libraries: ['Web Components', 'HTMX'] },
  css: { frameworks: ['Tailwind', 'Bootstrap', 'Bulma'], libraries: ['PostCSS', 'Sass', 'Animate.css'] },
  java: { frameworks: ['Spring Boot', 'Micronaut'], libraries: ['Jackson', 'Hibernate', 'JUnit'] },
  cpp: { frameworks: ['Qt', 'JUCE'], libraries: ['STL', 'Boost', 'fmt'] },
  c: { frameworks: ['GTK', 'raylib'], libraries: ['libcurl', 'OpenSSL'] },
  csharp: { frameworks: ['ASP.NET Core', '.NET MAUI'], libraries: ['Entity Framework', 'Serilog'] },
  kotlin: { frameworks: ['Ktor', 'Spring'], libraries: ['Coroutines', 'kotlinx.serialization'] },
  swift: { frameworks: ['SwiftUI', 'Vapor'], libraries: ['Alamofire', 'Kingfisher'] },
  php: { frameworks: ['Laravel', 'Symfony'], libraries: ['Guzzle', 'Monolog'] },
  rust: { frameworks: ['Actix', 'Axum'], libraries: ['Serde', 'Tokio', 'Reqwest'] },
  go: { frameworks: ['Fiber', 'Gin'], libraries: ['Cobra', 'Viper', 'GORM'] },
  sql: { frameworks: ['dbt'], libraries: ['PostgreSQL', 'SQLite', 'MySQL'] },
  json: { frameworks: [], libraries: ['JSON Schema', 'Ajv'] },
  markdown: { frameworks: ['Docusaurus', 'MkDocs'], libraries: ['remark', 'markdown-it'] },
  xml: { frameworks: [], libraries: ['XPath', 'XSLT'] },
  yaml: { frameworks: [], libraries: ['OpenAPI', 'Kubernetes'] },
  sass: { frameworks: [], libraries: ['Dart Sass'] },
  less: { frameworks: [], libraries: ['Less.js'] },
  angular: { frameworks: ['Angular'], libraries: ['RxJS', 'NgRx'] },
  vue: { frameworks: ['Nuxt', 'Vue'], libraries: ['Pinia', 'Vue Router'] },
  react: { frameworks: ['React', 'Next.js', 'Remix'], libraries: ['React Query', 'Redux Toolkit', 'Framer Motion'] },
  svelte: { frameworks: ['SvelteKit'], libraries: ['Svelte Store'] },
  liquid: { frameworks: ['Shopify'], libraries: ['Dawn'] },
  wast: { frameworks: ['WebAssembly'], libraries: ['wasmtime'] },
  ruby: { frameworks: ['Rails', 'Sinatra'], libraries: ['Puma', 'RSpec'] },
  perl: { frameworks: ['Mojolicious'], libraries: ['DBI', 'Dancer2'] },
  lua: { frameworks: ['LÃ–VE'], libraries: ['LuaRocks'] },
  dart: { frameworks: ['Flutter', 'Dart Frog'], libraries: ['http', 'riverpod'] },
  r: { frameworks: ['Shiny'], libraries: ['tidyverse', 'ggplot2'] },
  scala: { frameworks: ['Play', 'Akka'], libraries: ['Cats', 'ZIO'] },
  elixir: { frameworks: ['Phoenix'], libraries: ['Ecto', 'Oban'] },
  erlang: { frameworks: ['OTP'], libraries: ['Cowboy'] },
  shell: { frameworks: [], libraries: ['coreutils', 'jq'] },
  powershell: { frameworks: [], libraries: ['PowerShellGet', 'Az Module'] },
  'objective-c': { frameworks: ['Cocoa'], libraries: ['Foundation'] },
  julia: { frameworks: ['Genie'], libraries: ['DataFrames', 'Flux'] },
  haskell: { frameworks: ['Yesod'], libraries: ['aeson', 'lens'] },
  zig: { frameworks: [], libraries: ['std'] },
  clojure: { frameworks: ['Ring', 'Compojure'], libraries: ['core.async'] },
  fortran: { frameworks: [], libraries: ['LAPACK', 'BLAS'] },
  nim: { frameworks: ['Jester'], libraries: ['nimble'] },
  groovy: { frameworks: ['Grails'], libraries: ['Spock'] },
  solidity: { frameworks: ['Hardhat', 'Foundry'], libraries: ['OpenZeppelin'] },
};

const BOILERPLATE_SNIPPETS: BoilerplateSnippet[] = [
  { id: 'js-node', title: 'JavaScript Node Starter', language: 'javascript', frameworks: ['Node'], content: "console.log('Hello from Node');" },
  { id: 'js-react', title: 'React Component', language: 'react', frameworks: ['React'], content: "import React from 'react';\n\nexport default function App() {\n  return <main>Hello React</main>;\n}" },
  { id: 'ts-node', title: 'TypeScript Starter', language: 'typescript', frameworks: ['Node'], content: "type Message = string;\nconst msg: Message = 'Hello TypeScript';\nconsole.log(msg);" },
  { id: 'py-main', title: 'Python Main', language: 'python', frameworks: [], content: "def main() -> None:\n    print('Hello Python')\n\nif __name__ == '__main__':\n    main()" },
  { id: 'py-fastapi', title: 'Python FastAPI', language: 'python', frameworks: ['FastAPI'], content: "from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get('/')\ndef root():\n    return {'message': 'Hello FastAPI'}" },
  { id: 'html-basic', title: 'HTML5 Boilerplate', language: 'html', frameworks: [], content: "<!doctype html>\n<html lang='en'>\n<head>\n  <meta charset='UTF-8' />\n  <meta name='viewport' content='width=device-width, initial-scale=1.0' />\n  <title>Document</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>" },
  { id: 'css-basic', title: 'CSS Starter', language: 'css', frameworks: [], content: ":root {\n  --bg: #0d1117;\n  --fg: #e6edf3;\n}\n\nbody {\n  margin: 0;\n  background: var(--bg);\n  color: var(--fg);\n  font-family: system-ui, sans-serif;\n}" },
  { id: 'css-tailwind', title: 'Tailwind Layer Setup', language: 'css', frameworks: ['Tailwind'], content: "@tailwind base;\n@tailwind components;\n@tailwind utilities;" },
  { id: 'cpp-main', title: 'C++ Main', language: 'cpp', frameworks: [], content: "#include <iostream>\n\nint main() {\n  std::cout << \"Hello C++\" << std::endl;\n  return 0;\n}" },
  { id: 'c-main', title: 'C Main', language: 'c', frameworks: [], content: "#include <stdio.h>\n\nint main(void) {\n  printf(\"Hello C\\n\");\n  return 0;\n}" },
  { id: 'java-main', title: 'Java Main Class', language: 'java', frameworks: [], content: "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hello Java\");\n  }\n}" },
  { id: 'csharp-main', title: 'C# Program', language: 'csharp', frameworks: [], content: "using System;\n\nclass Program {\n  static void Main() {\n    Console.WriteLine(\"Hello C#\");\n  }\n}" },
  { id: 'kotlin-main', title: 'Kotlin Main', language: 'kotlin', frameworks: [], content: "fun main() {\n  println(\"Hello Kotlin\")\n}" },
  { id: 'swift-main', title: 'Swift Main', language: 'swift', frameworks: [], content: "import Foundation\n\nprint(\"Hello Swift\")" },
  { id: 'go-main', title: 'Go Main', language: 'go', frameworks: [], content: "package main\n\nimport \"fmt\"\n\nfunc main() {\n  fmt.Println(\"Hello Go\")\n}" },
  { id: 'rust-main', title: 'Rust Main', language: 'rust', frameworks: [], content: "fn main() {\n    println!(\"Hello Rust\");\n}" },
  { id: 'php-main', title: 'PHP Starter', language: 'php', frameworks: [], content: "<?php\necho 'Hello PHP';" },
  { id: 'ruby-main', title: 'Ruby Starter', language: 'ruby', frameworks: [], content: "puts 'Hello Ruby'" },
  { id: 'dart-main', title: 'Dart Starter', language: 'dart', frameworks: [], content: "void main() {\n  print('Hello Dart');\n}" },
  { id: 'r-main', title: 'R Script', language: 'r', frameworks: [], content: "message('Hello R')" },
  { id: 'lua-main', title: 'Lua Starter', language: 'lua', frameworks: [], content: "print('Hello Lua')" },
  { id: 'scala-main', title: 'Scala App', language: 'scala', frameworks: [], content: "object Main extends App {\n  println(\"Hello Scala\")\n}" },
  { id: 'shell-main', title: 'Shell Script', language: 'shell', frameworks: [], content: "#!/usr/bin/env bash\necho \"Hello shell\"" },
  { id: 'powershell-main', title: 'PowerShell Script', language: 'powershell', frameworks: [], content: "Write-Host \"Hello PowerShell\"" },
  { id: 'sql-main', title: 'SQL Table', language: 'sql', frameworks: [], content: "CREATE TABLE users (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL\n);" },
  { id: 'solidity-main', title: 'Solidity Contract', language: 'solidity', frameworks: [], content: "pragma solidity ^0.8.20;\n\ncontract Counter {\n  uint256 public count;\n  function inc() public { count += 1; }\n}" },
  { id: 'markdown-readme', title: 'README Template', language: 'markdown', frameworks: [], content: "# Project\n\n## Getting Started\n\n## Scripts\n\n## License" },
  { id: 'json-config', title: 'JSON Config', language: 'json', frameworks: [], content: "{\n  \"name\": \"app\",\n  \"version\": \"1.0.0\"\n}" },
];

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [openFileIds, setOpenFileIds] = useState<number[]>([]);
  const [draftByFileId, setDraftByFileId] = useState<Record<number, string>>({});
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [sidebarView, setSidebarView] = useState<SidebarView>('explorer');
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalMode, setTerminalMode] = useState<'console' | 'shell'>('console');
  const [shellCommand, setShellCommand] = useState('');
  const [shellOutput, setShellOutput] = useState<string[]>(['$ Shell ready']);
  const [activeTerminalJobId, setActiveTerminalJobId] = useState<string | null>(null);
  const [isShellRunning, setIsShellRunning] = useState(false);
  const [shellHistory, setShellHistory] = useState<string[]>([]);
  const [shellHistoryIndex, setShellHistoryIndex] = useState<number>(-1);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [commandCenterQuery, setCommandCenterQuery] = useState('');
  const [isBoilerplateOpen, setIsBoilerplateOpen] = useState(false);
  const [boilerplateQuery, setBoilerplateQuery] = useState('');
  const [activeTopMenu, setActiveTopMenu] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
  const [landingView, setLandingView] = useState<'home' | 'download'>('home');
  const [explorerFilter, setExplorerFilter] = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [isReplacingAll, setIsReplacingAll] = useState(false);
  const [ideSettings, setIdeSettings] = useState<IdeSettings>(DEFAULT_SETTINGS);
  const [extensionsState, setExtensionsState] = useState<ExtensionStateMap>(DEFAULT_EXTENSION_STATE);
  const [downloadingExtensionIds, setDownloadingExtensionIds] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState<string[]>(['> Ready...']);
  const [isSaving, setIsSaving] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiAgentMode, setIsAiAgentMode] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  // Create Project Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLanguage, setNewProjectLanguage] = useState('javascript');

  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const importFolderInputRef = useRef<HTMLInputElement | null>(null);
  const importFilesInputRef = useRef<HTMLInputElement | null>(null);

  const getEffectiveContent = (file: File) => draftByFileId[file.id] ?? file.content;

  const getDefaultContentForPath = (filePath: string) => {
    const normalized = filePath.toLowerCase();
    if (normalized.endsWith('.py')) return '# Start coding...';
    if (normalized.endsWith('.html')) return '<!DOCTYPE html>\n<html>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>';
    if (normalized.endsWith('.css')) return '/* Start styling... */';
    if (normalized.endsWith('.json')) return '{\n  \n}';
    if (normalized.endsWith('.md')) return '# Notes';
    if (normalized.endsWith('.cpp') || normalized.endsWith('.cc')) return '#include <iostream>\n\nint main() {\n  std::cout << "Hello C++" << std::endl;\n  return 0;\n}';
    if (normalized.endsWith('.c')) return '#include <stdio.h>\n\nint main(void) {\n  printf("Hello C\\n");\n  return 0;\n}';
    if (normalized.endsWith('.java')) return 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello Java");\n  }\n}';
    if (normalized.endsWith('.go')) return 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello Go")\n}';
    if (normalized.endsWith('.rs')) return 'fn main() {\n    println!("Hello Rust");\n}';
    if (normalized.endsWith('.sh')) return '#!/usr/bin/env bash\necho "Hello shell"';
    if (normalized.endsWith('.ps1')) return 'Write-Host "Hello PowerShell"';
    if (normalized.endsWith('.sql')) return 'SELECT 1;';
    return '// Start coding...';
  };

  const getNormalizedLanguage = (rawLanguage?: string | null) => {
    const value = (rawLanguage || '').toLowerCase();
    if (!value) return 'javascript';
    if (value === 'ts') return 'typescript';
    if (value === 'js') return 'javascript';
    return value;
  };

  const getLanguageForSnippet = () => {
    const extension = activeFile?.path.includes('.') ? activeFile.path.split('.').pop()?.toLowerCase() : '';
    const extMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'react',
      ts: 'typescript',
      tsx: 'react',
      py: 'python',
      html: 'html',
      css: 'css',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      kt: 'kotlin',
      swift: 'swift',
      php: 'php',
      rs: 'rust',
      go: 'go',
      sql: 'sql',
      json: 'json',
      md: 'markdown',
      xml: 'xml',
      yml: 'yaml',
      yaml: 'yaml',
      rb: 'ruby',
      lua: 'lua',
      dart: 'dart',
      r: 'r',
      scala: 'scala',
      sh: 'shell',
      ps1: 'powershell',
      sol: 'solidity',
    };
    const byExt = extension ? extMap[extension] : '';
    return getNormalizedLanguage(byExt || activeProject?.language || 'javascript');
  };

  const extensionEntries = useMemo<ResolvedExtensionEntry[]>(() => (
    EXTENSION_CATALOG.map(entry => ({
      ...entry,
      installed: extensionsState[entry.id]?.installed ?? false,
      enabled: extensionsState[entry.id]?.enabled ?? false,
      downloaded: extensionsState[entry.id]?.downloaded ?? false,
    }))
  ), [extensionsState]);

  const isExtensionEnabled = (extensionId: string) =>
    Boolean(extensionsState[extensionId]?.installed && extensionsState[extensionId]?.enabled);

  const getPathLanguage = (filePath: string) => {
    const normalized = filePath.toLowerCase();
    const ext = normalized.includes('.') ? normalized.split('.').pop() || '' : '';
    const map: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      cc: 'cpp',
      cxx: 'cpp',
      cs: 'csharp',
      kt: 'kotlin',
      swift: 'swift',
      php: 'php',
      rs: 'rust',
      go: 'go',
      sql: 'sql',
      sh: 'shell',
      ps1: 'powershell',
      rb: 'ruby',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
    };
    return map[ext] || 'javascript';
  };

  const chooseLanguageFromFiles = (paths: string[]) => {
    const counts: Record<string, number> = {};
    for (const path of paths) {
      const lang = getPathLanguage(path);
      counts[lang] = (counts[lang] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'javascript';
  };

  const openCommandPalette = (prefill = '') => {
    setCommandQuery(prefill);
    setIsCommandPaletteOpen(true);
  };

  const openSettingsPanel = () => {
    setIsSettingsOpen(true);
    setActiveTopMenu(null);
  };

  const openExtensionsPanel = () => {
    setIsExtensionsOpen(true);
    setActiveTopMenu(null);
  };
  const triggerPlatformDownload = (platform: 'Android' | 'Windows', extension: '.apk' | '.exe') => {
    const accepted = window.confirm(`Download VElo Code for ${platform} (${extension})?`);
    if (!accepted) return;

    // Real installer links will be attached later.
    window.alert(`${platform} installer slot is ready. Attach your ${extension} file URL here.`);
  };

  const toggleExtensionInstall = async (extensionId: string) => {
    const manifest = EXTENSION_CATALOG.find(entry => entry.id === extensionId);
    if (!manifest) return;

    const current = extensionsState[extensionId] || { installed: false, enabled: false, downloaded: false };

    if (current.installed) {
      setExtensionsState(prev => ({
        ...prev,
        [extensionId]: {
          ...(prev[extensionId] || { installed: false, enabled: false, downloaded: false }),
          installed: false,
          enabled: false,
        },
      }));
      return;
    }

    if (downloadingExtensionIds.includes(extensionId)) return;
    setDownloadingExtensionIds(prev => [...prev, extensionId]);
    try {
      const res = await fetch(manifest.downloadPath, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Failed to download ${manifest.name}`);
      }
      await res.text();
      setExtensionsState(prev => ({
        ...prev,
        [extensionId]: {
          ...(prev[extensionId] || { installed: false, enabled: false, downloaded: false }),
          installed: true,
          enabled: true,
          downloaded: true,
        },
      }));
      setOutput(prev => [...prev, `> Extension installed: ${manifest.name}`]);
    } catch (error: any) {
      window.alert(error.message || 'Extension download failed');
    } finally {
      setDownloadingExtensionIds(prev => prev.filter(id => id !== extensionId));
    }
  };

  const toggleExtensionEnable = (extensionId: string) => {
    setExtensionsState(prev => {
      const current = prev[extensionId] || { installed: false, enabled: false, downloaded: false };
      if (!current.installed) return prev;
      const nextEnabled = !current.enabled;
      const next = { ...prev, [extensionId]: { ...current, enabled: nextEnabled } };

      if (extensionId === 'theme-vscode-dark' && nextEnabled) {
        next['theme-vscode-light'] = { ...(next['theme-vscode-light'] || { installed: true, enabled: false, downloaded: true }), enabled: false };
        setIdeSettings(settings => ({ ...settings, editorTheme: 'vscode-dark' }));
      }
      if (extensionId === 'theme-vscode-light' && nextEnabled) {
        next['theme-vscode-dark'] = { ...(next['theme-vscode-dark'] || { installed: true, enabled: false, downloaded: true }), enabled: false };
        setIdeSettings(settings => ({ ...settings, editorTheme: 'vscode-light' }));
      }
      return next;
    });
  };

  const applyThemeExtension = (theme: 'vscode-dark' | 'vscode-light') => {
    setIdeSettings(prev => ({ ...prev, editorTheme: theme }));
    setExtensionsState(prev => ({
      ...prev,
      'theme-vscode-dark': {
        ...(prev['theme-vscode-dark'] || { installed: true, enabled: false, downloaded: true }),
        installed: true,
        enabled: theme === 'vscode-dark',
        downloaded: true,
      },
      'theme-vscode-light': {
        ...(prev['theme-vscode-light'] || { installed: true, enabled: false, downloaded: true }),
        installed: true,
        enabled: theme === 'vscode-light',
        downloaded: true,
      },
    }));
  };

  const openFile = (file: File, closeSidebarOnMobile = false) => {
    setActiveFile(file);
    setCode(getEffectiveContent(file));
    setPreviewDocument(null);
    setOpenFileIds(prev => (prev.includes(file.id) ? prev : [...prev, file.id]));
    if (closeSidebarOnMobile && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const openFileAtLine = (file: File, lineNumber: number) => {
    openFile(file, true);
    window.setTimeout(() => {
      const view = editorRef.current?.view;
      if (!view) return;
      const safeLine = Math.min(Math.max(lineNumber, 1), view.state.doc.lines);
      const line = view.state.doc.line(safeLine);
      view.dispatch({
        selection: { anchor: line.from },
        scrollIntoView: true,
      });
      view.focus();
    }, 0);
  };

  const closeFileTab = (fileId: number) => {
    const nextOpenFileIds = openFileIds.filter(id => id !== fileId);
    setOpenFileIds(nextOpenFileIds);

    if (activeFile?.id === fileId) {
      const closedIndex = openFileIds.indexOf(fileId);
      const fallbackId = nextOpenFileIds[closedIndex] ?? nextOpenFileIds[closedIndex - 1];
      const fallbackFile = files.find(file => file.id === fallbackId) ?? null;
      setActiveFile(fallbackFile);
      setCode(fallbackFile ? getEffectiveContent(fallbackFile) : '');
    }

    setDraftByFileId(prev => {
      if (!(fileId in prev)) return prev;
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
  };

  const openExplorerView = () => {
    setSidebarView('explorer');
    if (!sidebarOpen) {
      setSidebarOpen(true);
    }
  };

  const openSearchView = () => {
    setSidebarView('search');
    if (!sidebarOpen) {
      setSidebarOpen(true);
    }
  };

  useEffect(() => {
    try {
      const rawSettings = window.localStorage.getItem('velo.ide.settings');
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings) as Partial<IdeSettings>;
        setIdeSettings(prev => ({ ...prev, ...parsed }));
      }
      const rawExtensions = window.localStorage.getItem('velo.ide.extensions');
      if (rawExtensions) {
        const parsed = JSON.parse(rawExtensions) as ExtensionStateMap;
        setExtensionsState(prev => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore corrupted local state
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('velo.ide.settings', JSON.stringify(ideSettings));
  }, [ideSettings]);

  useEffect(() => {
    window.localStorage.setItem('velo.ide.extensions', JSON.stringify(extensionsState));
  }, [extensionsState]);

  useEffect(() => {
    if (!isExtensionEnabled('ai-chat-assistant')) {
      setAiChatOpen(false);
    }
    if (!isExtensionEnabled('ai-agent')) {
      setIsAiAgentMode(false);
    }
  }, [extensionsState]);

  // WebSocket Connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    
    socket.onopen = () => {
      console.log('Connected to WebSocket');
    };
    
    socket.onmessage = (event) => {
      // Handle incoming messages
      console.log('Message from server:', event.data);
    };
    
    setWs(socket);
    
    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobileViewport(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!activeProject && isMobileViewport) {
      setSidebarOpen(false);
    }
  }, [activeProject, isMobileViewport]);

  // Fetch projects on load
  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        if (data.length > 0) {
          // Don't auto-select project to show dashboard first
        }
      });
  }, []);

  // Fetch files when project changes
  useEffect(() => {
    if (!activeProject) {
      setFiles([]);
      setActiveFile(null);
      setOpenFileIds([]);
      setDraftByFileId({});
      setCode('');
      return;
    }

    fetch(`/api/projects/${activeProject.id}/files`)
      .then(res => res.json())
      .then(data => {
        setFiles(data);
        setDraftByFileId({});
        setExplorerFilter('');
        setGlobalSearchQuery('');
        setSidebarView('explorer');
        if (data.length > 0) {
          setActiveFile(data[0]);
          setOpenFileIds([data[0].id]);
          setCode(data[0].content);
        } else {
          setActiveFile(null);
          setOpenFileIds([]);
          setCode('');
        }
      });
  }, [activeProject]);

  const handleSave = async () => {
    if (!activeFile || !activeProject) return;
    const contentToSave = draftByFileId[activeFile.id] ?? code;
    setIsSaving(true);
    try {
      await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          path: activeFile.path,
          content: contentToSave
        })
      });
      
      // Update local state
      setFiles(prev => prev.map(file => (
        file.id === activeFile.id ? { ...file, content: contentToSave } : file
      )));
      setDraftByFileId(prev => {
        if (!(activeFile.id in prev)) return prev;
        const next = { ...prev };
        delete next[activeFile.id];
        return next;
      });
      setCode(contentToSave);
      setIsSaving(false);
    } catch (e) {
      console.error(e);
      setIsSaving(false);
    }
  };

  const handleRun = async () => {
    if (!activeFile) return;
    if (!isExtensionEnabled('runner-core')) {
      setOutput(prev => [...prev, '> Code Runner Core extension is disabled. Enable it from Extensions panel.']);
      return;
    }

    const normalizedRunLanguage = getNormalizedLanguage(
      getPathLanguage(activeFile.path) || activeProject?.language || 'javascript'
    );
    const runnerExtensionId = getRunnerExtensionIdForLanguage(normalizedRunLanguage);
    const runnerManifest = EXTENSION_CATALOG.find(entry => entry.id === runnerExtensionId);

    if (runnerExtensionId && !isExtensionEnabled(runnerExtensionId)) {
      const extLabel = runnerManifest?.name || runnerExtensionId;
      setOutput(prev => [...prev, `> ${extLabel} is not enabled. Install/enable it from Extensions panel.`]);
      return;
    }

    setTerminalOpen(true);
    setOutput(prev => [...prev, `> Running ${activeFile.path} (${normalizedRunLanguage})...`]);

    if (runnerManifest?.runnerMode === 'browser') {
      const browserResult = await runInBrowser({
        language: normalizedRunLanguage,
        code,
        filePath: activeFile.path,
      });

      if (browserResult.handled) {
        if (browserResult.previewDocument) {
          setPreviewDocument(browserResult.previewDocument);
          setPreviewMode(true);
        } else {
          setPreviewDocument(null);
        }
        setOutput(prev => [...prev, ...browserResult.output, '> Done.']);
        return;
      }
    }

    if (normalizedRunLanguage === 'html') {
      setPreviewDocument(code);
      setPreviewMode(prev => !prev);
      return;
    }

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: normalizedRunLanguage,
          filePath: activeFile.path,
        }),
      });
      const data = await res.json();
      setOutput(prev => [...prev, ...(Array.isArray(data.output) ? data.output : ['> No output']), '> Done.']);
    } catch {
      setOutput(prev => [...prev, '> Execution failed (server unreachable).']);
    }
  };

  const createProject = () => {
    setNewProjectName('');
    setNewProjectLanguage('javascript');
    setSidebarView('explorer');
    setIsCreateModalOpen(true);
  };

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newProjectName, 
          language: newProjectLanguage, 
          description: 'New Project' 
        })
      });
      const newProject = await res.json();
      setProjects([newProject, ...projects]);
      setActiveProject(newProject);
      setSidebarView('explorer');
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const createProjectViaApi = async (name: string, language: string, description: string) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, language, description }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create project');
    return data as Project;
  };

  const formatDocument = () => {
    if (!activeFile) return;
    const filePath = activeFile.path.toLowerCase();
    const current = code;
    let next = current;

    if (filePath.endsWith('.json')) {
      try {
        next = `${JSON.stringify(JSON.parse(current), null, 2)}\n`;
      } catch {
        // keep fallback formatting when JSON is invalid
      }
    }

    if (next === current) {
      const lines = current.replace(/\r/g, '').split('\n').map(line => line.replace(/\s+$/g, ''));
      next = lines.join('\n');
      if (!next.endsWith('\n')) next += '\n';
    }

    setCode(next);
    setDraftByFileId(prev => ({ ...prev, [activeFile.id]: next }));
    setOutput(prev => [...prev, `> Formatted ${activeFile.path}`]);
  };

  const selectAllInEditor = () => {
    const view = editorRef.current?.view;
    if (!view) return;
    view.dispatch({
      selection: { anchor: 0, head: view.state.doc.length },
      scrollIntoView: true,
    });
    view.focus();
  };

  const openNewWindow = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  const runShellPreset = (command: string) => {
    setTerminalOpen(true);
    setTerminalMode('shell');
    setShellCommand(command);
  };

  const toggleTerminalPanel = () => {
    setTerminalOpen(prev => {
      const next = !prev;
      if (next) {
        setTerminalMode(ideSettings.defaultTerminalMode);
      }
      return next;
    });
  };

  const importBrowserFiles = async (selectedFiles: FileList | null, asFolderImport: boolean) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    const items = Array.from(selectedFiles);
    const maxFiles = 250;
    if (items.length > maxFiles) {
      window.alert(`Please import up to ${maxFiles} files at once.`);
      return;
    }

    try {
      const firstItem = items[0];
      const firstRelativePath = (firstItem as unknown as globalThis.File & { webkitRelativePath?: string }).webkitRelativePath || firstItem.name;
      const folderName = firstRelativePath.split('/')[0] || `Imported ${new Date().toLocaleTimeString()}`;

      let targetProject = activeProject;
      if (!targetProject) {
        const languageGuess = chooseLanguageFromFiles(
          items.map(item => ((item as unknown as globalThis.File & { webkitRelativePath?: string }).webkitRelativePath || item.name))
        );
        targetProject = await createProjectViaApi(folderName, languageGuess, 'Imported from device');
        setProjects(prev => [targetProject!, ...prev]);
        setActiveProject(targetProject);
      }

      const createdPaths: string[] = [];
      for (const item of items) {
        const candidatePath = asFolderImport
          ? (((item as unknown as globalThis.File & { webkitRelativePath?: string }).webkitRelativePath || item.name).split('/').slice(1).join('/') || item.name)
          : item.name;
        const normalizedPath = candidatePath.replace(/\\/g, '/').replace(/^\/+/, '');
        if (!normalizedPath) continue;
        const content = await item.text();

        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: targetProject.id,
            path: normalizedPath,
            content,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Failed to import ${normalizedPath}`);
        }
        createdPaths.push(normalizedPath);
      }

      if (targetProject.id === activeProject?.id) {
        const res = await fetch(`/api/projects/${targetProject.id}/files`);
        const data = await res.json() as File[];
        setFiles(data);
        if (data.length > 0) {
          const targetPath = createdPaths[0];
          const first = data.find(file => file.path === targetPath) || data[0];
          openFile(first, isMobileViewport);
        }
      }

      setOutput(prev => [...prev, `> Imported ${createdPaths.length} file(s) into ${targetProject.name}.`]);
      setSidebarView('explorer');
      if (isMobileViewport) setSidebarOpen(false);
    } catch (error: any) {
      window.alert(error.message || 'Import failed');
    }
  };

  const triggerImportFolder = () => {
    importFolderInputRef.current?.click();
    setActiveTopMenu(null);
  };

  const triggerImportFiles = () => {
    importFilesInputRef.current?.click();
    setActiveTopMenu(null);
  };

  const createQuickWorkspaceWithFile = async () => {
    const defaultLanguage = 'javascript';
    const defaultFilePath = 'main.js';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const workspaceName = `Velo Mobile ${timestamp}`;

    try {
      const projectRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workspaceName,
          language: defaultLanguage,
          description: 'Quick mobile workspace',
        }),
      });

      const projectData = await projectRes.json();
      if (!projectRes.ok) {
        throw new Error(projectData.error || 'Failed to create workspace');
      }

      const newProject = projectData as Project;

      const fileRes = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: newProject.id,
          path: defaultFilePath,
          content: getDefaultContentForPath(defaultFilePath),
        }),
      });

      const fileData = await fileRes.json();
      if (!fileRes.ok) {
        throw new Error(fileData.error || 'Workspace created, but file creation failed');
      }

      setProjects(prev => [newProject, ...prev]);
      setActiveProject(newProject);
      setSidebarView('explorer');
      setSidebarOpen(false);
    } catch (error: any) {
      window.alert(error.message || 'Failed to create quick workspace');
    }
  };

  const createFile = async () => {
    if (!activeProject) return;
    const requestedPath = window.prompt('Enter new file path', 'index.js');
    if (!requestedPath) return;

    const normalizedPath = requestedPath.trim();
    if (!normalizedPath) return;

    if (files.some(file => file.path === normalizedPath)) {
      window.alert('A file with this path already exists.');
      return;
    }

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          path: normalizedPath,
          content: getDefaultContentForPath(normalizedPath),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create file');
      }

      const createdFile = data.file as File | undefined;
      if (!createdFile) {
        throw new Error('File was created but not returned by server');
      }

      setFiles(prev => [...prev, createdFile]);
      openFile(createdFile, true);
      setSidebarView('explorer');
    } catch (error: any) {
      window.alert(error.message || 'Failed to create file');
    }
  };

  const renameFile = async (file: File | null = activeFile) => {
    if (!file) return;
    const requestedPath = window.prompt('Rename file path', file.path);
    if (!requestedPath) return;

    const normalizedPath = requestedPath.trim();
    if (!normalizedPath || normalizedPath === file.path) return;

    if (files.some(entry => entry.id !== file.id && entry.path === normalizedPath)) {
      window.alert('A file with this path already exists.');
      return;
    }

    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: normalizedPath }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to rename file');
      }

      const updatedFile = data.file as File | undefined;
      if (!updatedFile) {
        throw new Error('Updated file payload missing');
      }

      setFiles(prev => prev.map(entry => (
        entry.id === file.id ? { ...entry, path: updatedFile.path, updated_at: updatedFile.updated_at } : entry
      )));
      if (activeFile?.id === file.id) {
        setActiveFile(prev => (prev ? { ...prev, path: updatedFile.path, updated_at: updatedFile.updated_at } : prev));
      }
    } catch (error: any) {
      window.alert(error.message || 'Failed to rename file');
    }
  };

  const deleteFile = async (file: File | null = activeFile) => {
    if (!file) return;
    const shouldDelete = window.confirm(`Delete "${file.path}"?`);
    if (!shouldDelete) return;

    try {
      const res = await fetch(`/api/files/${file.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete file');
      }

      closeFileTab(file.id);
      setFiles(prev => prev.filter(entry => entry.id !== file.id));
      setDraftByFileId(prev => {
        if (!(file.id in prev)) return prev;
        const next = { ...prev };
        delete next[file.id];
        return next;
      });
      setSidebarView('explorer');
    } catch (error: any) {
      window.alert(error.message || 'Failed to delete file');
    }
  };

  const refreshProjectFiles = async (focusPath?: string) => {
    if (!activeProject) return;
    const res = await fetch(`/api/projects/${activeProject.id}/files`);
    const data = await res.json() as File[];
    setFiles(data);
    setDraftByFileId({});

    if (data.length === 0) {
      setActiveFile(null);
      setOpenFileIds([]);
      setCode('');
      return;
    }

    let nextFile = focusPath ? data.find(file => file.path === focusPath) : undefined;
    if (!nextFile && activeFile) {
      nextFile = data.find(file => file.path === activeFile.path);
    }
    if (!nextFile) nextFile = data[0];

    setActiveFile(nextFile);
    setCode(nextFile.content);
    setOpenFileIds(prev => {
      const validOpenIds = prev.filter(id => data.some(file => file.id === id));
      return validOpenIds.includes(nextFile.id) ? validOpenIds : [...validOpenIds, nextFile.id];
    });
  };

  const applyAgentActions = async (actions: AgentAction[]) => {
    if (!activeProject || actions.length === 0) {
      return { applied: 0, errors: [] as string[], focusPath: activeFile?.path || '' };
    }

    let currentFiles = [...files];
    let applied = 0;
    const errors: string[] = [];
    let focusPath = activeFile?.path || '';

    for (const action of actions) {
      try {
        if (action.type === 'open_file') {
          focusPath = action.path;
          continue;
        }

        if (action.type === 'create_file' || action.type === 'update_file') {
          const res = await fetch('/api/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: activeProject.id,
              path: action.path,
              content: action.content,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || `Failed to ${action.type} ${action.path}`);
          }
          const updatedFile = data.file as File | undefined;
          if (updatedFile) {
            const index = currentFiles.findIndex(file => file.id === updatedFile.id);
            if (index >= 0) {
              currentFiles[index] = updatedFile;
            } else {
              currentFiles.push(updatedFile);
            }
          }
          applied += 1;
          focusPath = action.path;
          continue;
        }

        if (action.type === 'rename_file') {
          const existing = currentFiles.find(file => file.path === action.path);
          if (!existing) {
            errors.push(`Rename skipped: ${action.path} not found.`);
            continue;
          }
          const res = await fetch(`/api/files/${existing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: action.newPath }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || `Failed to rename ${action.path}`);
          }
          const renamedFile = data.file as File | undefined;
          if (renamedFile) {
            currentFiles = currentFiles.map(file => (file.id === renamedFile.id ? renamedFile : file));
          }
          applied += 1;
          focusPath = action.newPath;
          continue;
        }

        if (action.type === 'delete_file') {
          const existing = currentFiles.find(file => file.path === action.path);
          if (!existing) {
            errors.push(`Delete skipped: ${action.path} not found.`);
            continue;
          }
          const res = await fetch(`/api/files/${existing.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || `Failed to delete ${action.path}`);
          }
          currentFiles = currentFiles.filter(file => file.id !== existing.id);
          applied += 1;
          if (focusPath === action.path) {
            focusPath = '';
          }
        }
      } catch (error: any) {
        errors.push(error.message || `Action failed: ${action.type}`);
      }
    }

    if (applied > 0 || focusPath) {
      await refreshProjectFiles(focusPath || undefined);
    }

    return { applied, errors, focusPath };
  };

  const handleReplaceAll = async () => {
    if (!activeProject) return;
    const findText = globalSearchQuery;
    if (!findText.trim()) {
      window.alert('Enter text in search first.');
      return;
    }

    setIsReplacingAll(true);
    try {
      const changedContentByFileId: Record<number, string> = {};
      let changedFiles = 0;

      for (const file of files) {
        const currentContent = getEffectiveContent(file);
        if (!currentContent.includes(findText)) continue;

        const nextContent = currentContent.split(findText).join(replaceValue);
        if (nextContent === currentContent) continue;

        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: activeProject.id,
            path: file.path,
            content: nextContent,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Failed to update ${file.path}`);
        }

        changedContentByFileId[file.id] = nextContent;
        changedFiles += 1;
      }

      if (changedFiles === 0) {
        setOutput(prev => [...prev, '> Replace all: no matching files changed.']);
        return;
      }

      setFiles(prev => prev.map(file => (
        changedContentByFileId[file.id] !== undefined
          ? { ...file, content: changedContentByFileId[file.id], updated_at: new Date().toISOString() }
          : file
      )));
      setDraftByFileId(prev => {
        const next = { ...prev };
        for (const fileId of Object.keys(changedContentByFileId)) {
          delete next[Number(fileId)];
        }
        return next;
      });

      if (activeFile && changedContentByFileId[activeFile.id] !== undefined) {
        setCode(changedContentByFileId[activeFile.id]);
      }
      setOutput(prev => [...prev, `> Replace all: updated ${changedFiles} file(s).`]);
    } catch (error: any) {
      window.alert(error.message || 'Replace all failed');
    } finally {
      setIsReplacingAll(false);
    }
  };

  const runShellCommand = async () => {
    const command = shellCommand.trim();
    if (!command || isShellRunning) return;

    setTerminalOpen(true);
    setTerminalMode('shell');
    setShellOutput(prev => [...prev, `$ ${command}`]);
    setShellCommand('');
    setShellHistory(prev => (prev[0] === command ? prev : [command, ...prev].slice(0, 100)));
    setShellHistoryIndex(-1);

    try {
      const res = await fetch('/api/terminal/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start command');
      }
      setActiveTerminalJobId(data.jobId);
      setIsShellRunning(true);
    } catch (error: any) {
      setShellOutput(prev => [...prev, `Error: ${error.message || 'Command failed to start'}`]);
      setIsShellRunning(false);
      setActiveTerminalJobId(null);
    }
  };

  const onShellInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      runShellCommand();
      return;
    }
    if (!isExtensionEnabled('terminal-tools')) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (shellHistory.length === 0) return;
      const nextIndex = Math.min(shellHistoryIndex + 1, shellHistory.length - 1);
      setShellHistoryIndex(nextIndex);
      setShellCommand(shellHistory[nextIndex] || '');
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (shellHistory.length === 0) return;
      const nextIndex = shellHistoryIndex - 1;
      if (nextIndex < 0) {
        setShellHistoryIndex(-1);
        setShellCommand('');
      } else {
        setShellHistoryIndex(nextIndex);
        setShellCommand(shellHistory[nextIndex] || '');
      }
    }
  };

  const stopShellCommand = async () => {
    if (!activeTerminalJobId) return;
    try {
      await fetch(`/api/terminal/jobs/${activeTerminalJobId}/stop`, { method: 'POST' });
    } catch {
      // no-op, polling will settle with current process state
    }
  };

  const openBoilerplatePicker = () => {
    setBoilerplateQuery('');
    setIsBoilerplateOpen(true);
  };

  const applyBoilerplateSnippet = (snippet: BoilerplateSnippet) => {
    const view = editorRef.current?.view;
    if (!view) return;

    const cursor = view.state.selection.main.head;
    const line = view.state.doc.lineAt(cursor);
    const leftText = view.state.doc.sliceString(line.from, cursor);
    const replaceBang = leftText.endsWith('!');
    const from = replaceBang ? cursor - 1 : cursor;

    view.dispatch({
      changes: { from, to: cursor, insert: snippet.content },
      selection: { anchor: from + snippet.content.length },
      scrollIntoView: true,
    });
    view.focus();
    setIsBoilerplateOpen(false);
    setBoilerplateQuery('');
  };

  const handleAiCompletion = async () => {
    if (!activeProject || !code) return;
    
    // Insert a comment to show loading
    const view = editorRef.current?.view;
    if (!view) return;
    
    const cursor = view.state.selection.main.head;
    const loadingText = ' // AI Thinking...';
    
    view.dispatch({
      changes: { from: cursor, insert: loadingText }
    });
    
    try {
      const res = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.substring(0, cursor), // Send code up to cursor
          language: activeProject.language
        })
      });
      
      const data = await res.json();
      
      // Remove loading text and insert completion
      view.dispatch({
        changes: { from: cursor, to: cursor + loadingText.length, insert: data.completion || '' }
      });
      
    } catch (e) {
      console.error(e);
      // Remove loading text on error
      view.dispatch({
        changes: { from: cursor, to: cursor + loadingText.length, insert: '' }
      });
    }
  };

  const handleAiChat = async () => {
    const promptText = aiInput.trim();
    if (!promptText) return;

    setMessages(prev => [...prev, { role: 'user', text: promptText }]);
    setAiInput('');
    setIsAiLoading(true);

    try {
      if (isAiAgentMode && activeProject && isExtensionEnabled('ai-agent')) {
        const res = await fetch('/api/ai/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: promptText,
            project: {
              id: activeProject.id,
              name: activeProject.name,
              language: activeProject.language,
            },
            activeFilePath: activeFile?.path || '',
            files: files.map(file => ({
              path: file.path,
              content: getEffectiveContent(file),
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Agent request failed');
        }

        const actions = Array.isArray(data.actions) ? data.actions as AgentAction[] : [];
        const actionResult = await applyAgentActions(actions);
        let replyText = (typeof data.reply === 'string' && data.reply.trim())
          ? data.reply.trim()
          : 'Done.';

        if (actions.length > 0) {
          replyText += `\n\nPlanned actions: ${actions.length}, applied: ${actionResult.applied}.`;
        }
        if (actionResult.errors.length > 0) {
          replyText += `\nErrors: ${actionResult.errors.join(' | ')}`;
        }
        setMessages(prev => [...prev, { role: 'ai', text: replyText }]);
        return;
      }

      const res = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          context: `User Question: ${promptText}
Active File: ${activeFile?.path || 'none'}
Open Files: ${openFiles.map(file => file.path).join(', ') || 'none'}
Project: ${activeProject?.name || 'none'} (${activeProject?.language || 'text'})`,
          language: activeProject?.language || 'text'
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.completion || 'I could not generate a response.' }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Error connecting to AI agent.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleEditorChange = (value: string) => {
    setCode(value);
    setPreviewDocument(null);
    if (!activeFile) return;
    setDraftByFileId(prev => ({ ...prev, [activeFile.id]: value }));
    if (!isBoilerplateOpen && value.endsWith('!')) {
      openBoilerplatePicker();
    }
  };

  const insertChar = (char: string) => {
    const view = editorRef.current?.view;
    if (!view) return;
    const cursor = view.state.selection.main.head;
    view.dispatch({
      changes: { from: cursor, insert: char },
      selection: { anchor: cursor + char.length }
    });
    view.focus();
  };

  const handleAnalyze = async () => {
    if (!activeProject || !code) return;
    const view = editorRef.current?.view;
    if (!view) return;

    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/ai/lint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          language: activeProject.language
        })
      });
      
      const data = await res.json();
      const diagnostics: Diagnostic[] = (data.diagnostics || []).map((d: any) => {
        // Convert line number to character offset
        const line = Math.max(1, Math.min(d.line, view.state.doc.lines));
        const lineObj = view.state.doc.line(line);
        
        return {
          from: lineObj.from,
          to: lineObj.to,
          severity: d.severity || 'warning',
          message: d.message,
          actions: d.fix ? [{
            name: "Apply Fix",
            apply: (view: EditorView, from: number, to: number) => {
              view.dispatch({
                changes: { from, to, insert: d.fix }
              });
            }
          }] : undefined
        };
      });

      view.dispatch(setDiagnostics(view.state, diagnostics));
    } catch (e) {
      console.error("Analysis failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const hasModifier = event.metaKey || event.ctrlKey;

      if (hasModifier && event.shiftKey && key === 'p') {
        event.preventDefault();
        openCommandPalette();
      }

      if (hasModifier && key === 'p' && !event.shiftKey) {
        event.preventDefault();
        openCommandPalette();
      }

      if (hasModifier && key === 'n' && !event.shiftKey) {
        event.preventDefault();
        if (activeProject) {
          createFile();
        } else {
          createProject();
        }
      }

      if (hasModifier && key === ',') {
        event.preventDefault();
        openSettingsPanel();
      }

      if (hasModifier && key === 's') {
        event.preventDefault();
        handleSave();
      }

      if (hasModifier && event.shiftKey && key === 'f') {
        event.preventDefault();
        openSearchView();
      }

      if (event.altKey && event.shiftKey && key === 'f') {
        event.preventDefault();
        formatDocument();
      }

      if (hasModifier && event.shiftKey && key === 'h') {
        event.preventDefault();
        openSearchView();
      }

      if (hasModifier && event.shiftKey && key === 'b') {
        event.preventDefault();
        openBoilerplatePicker();
      }

      if (event.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setActiveTopMenu(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeProject, createFile, createProject, handleSave, openSearchView, openBoilerplatePicker]);

  useEffect(() => {
    if (!activeTerminalJobId) return;
    let isCancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/terminal/jobs/${activeTerminalJobId}`);
        const data = await res.json();
        if (!res.ok) return;
        if (isCancelled) return;

        setShellOutput(Array.isArray(data.output) ? data.output : []);
        const done = Boolean(data.done);
        setIsShellRunning(!done);
        if (done) {
          fetch(`/api/terminal/jobs/${activeTerminalJobId}`, { method: 'DELETE' }).catch(() => undefined);
          setActiveTerminalJobId(null);
        }
      } catch {
        if (isCancelled) return;
      }
    };

    poll();
    const timer = window.setInterval(poll, 900);
    return () => {
      isCancelled = true;
      window.clearInterval(timer);
    };
  }, [activeTerminalJobId]);

  useEffect(() => {
    setOpenFileIds(prev => {
      const next = prev.filter(id => files.some(file => file.id === id));
      return next.length === prev.length ? prev : next;
    });
  }, [files]);

  const openFiles = useMemo(
    () => openFileIds.map(id => files.find(file => file.id === id)).filter(Boolean) as File[],
    [openFileIds, files],
  );

  const filteredExplorerFiles = useMemo(() => {
    const query = explorerFilter.trim().toLowerCase();
    if (!query) return files;
    return files.filter(file => file.path.toLowerCase().includes(query));
  }, [files, explorerFilter]);

  const searchResults = useMemo<ProjectSearchHit[]>(() => {
    const query = globalSearchQuery.trim().toLowerCase();
    if (!query) return [];

    const results: ProjectSearchHit[] = [];
    for (const file of files) {
      const lines = getEffectiveContent(file).split(/\r?\n/);
      for (let index = 0; index < lines.length; index++) {
        if (!lines[index].toLowerCase().includes(query)) continue;
        results.push({
          file,
          lineNumber: index + 1,
          preview: lines[index].trim() || '(empty line)',
        });
        if (results.length >= 80) {
          return results;
        }
      }
    }
    return results;
  }, [files, globalSearchQuery, draftByFileId]);

  const hasUnsavedChanges = activeFile
    ? getEffectiveContent(activeFile) !== activeFile.content
    : false;

  useEffect(() => {
    if (!ideSettings.autoSave || !activeFile || !hasUnsavedChanges) return;
    const timer = window.setTimeout(() => {
      handleSave();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [activeFile, code, draftByFileId, hasUnsavedChanges, ideSettings.autoSave]);

  const activeLanguage = getNormalizedLanguage(activeProject?.language);
  const activeLanguageEcosystem = LANGUAGE_ECOSYSTEM[activeLanguage] || { frameworks: [], libraries: [] };

  const filteredBoilerplates = useMemo(() => {
    const query = boilerplateQuery.trim().toLowerCase();
    const currentLanguage = getLanguageForSnippet();
    const sorted = [...BOILERPLATE_SNIPPETS].sort((a, b) => {
      const aScore = a.language === currentLanguage ? 0 : 1;
      const bScore = b.language === currentLanguage ? 0 : 1;
      return aScore - bScore;
    });

    if (!query) return sorted;
    return sorted.filter(snippet => {
      const haystack = `${snippet.title} ${snippet.language} ${snippet.frameworks.join(' ')}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [boilerplateQuery, activeProject?.language, activeFile?.path]);

  const quickActions = useMemo<QuickAction[]>(() => ([
    {
      id: 'save-file',
      label: 'Save Current File',
      hint: 'Ctrl+S',
      run: () => handleSave(),
      disabled: !activeFile,
    },
    {
      id: 'run-file',
      label: 'Run Active File',
      run: () => handleRun(),
      disabled: !activeFile,
    },
    {
      id: 'open-boilerplates',
      label: 'Insert Boilerplate Snippet',
      hint: 'Ctrl+Shift+B',
      run: () => openBoilerplatePicker(),
      disabled: !activeFile,
    },
    {
      id: 'new-file',
      label: 'Create New File',
      hint: 'Ctrl+N',
      run: () => createFile(),
      disabled: !activeProject,
    },
    {
      id: 'format-document',
      label: 'Format Document',
      hint: 'Shift+Alt+F',
      run: () => formatDocument(),
      disabled: !activeFile,
    },
    {
      id: 'toggle-word-wrap',
      label: ideSettings.wordWrap ? 'Disable Word Wrap' : 'Enable Word Wrap',
      run: () => setIdeSettings(prev => ({ ...prev, wordWrap: !prev.wordWrap })),
      disabled: !activeFile,
    },
    {
      id: 'rename-file',
      label: 'Rename Active File',
      run: () => renameFile(),
      disabled: !activeFile,
    },
    {
      id: 'delete-file',
      label: 'Delete Active File',
      run: () => deleteFile(),
      disabled: !activeFile,
    },
    {
      id: 'toggle-terminal',
      label: terminalOpen ? 'Hide Terminal' : 'Show Terminal',
      run: () => toggleTerminalPanel(),
    },
    {
      id: 'open-shell',
      label: 'Open Shell Terminal',
      run: () => {
        setTerminalOpen(true);
        setTerminalMode('shell');
      },
    },
    {
      id: 'toggle-ai',
      label: aiChatOpen ? 'Hide AI Assistant' : 'Show AI Assistant',
      run: () => setAiChatOpen(prev => !prev),
    },
    {
      id: 'open-search',
      label: 'Open Search Panel',
      hint: 'Ctrl+Shift+F',
      run: () => openSearchView(),
      disabled: !activeProject,
    },
    {
      id: 'replace-all',
      label: 'Replace In Project',
      hint: 'Ctrl+Shift+H',
      run: () => openSearchView(),
      disabled: !activeProject,
    },
    {
      id: 'open-explorer',
      label: 'Open Explorer Panel',
      run: () => openExplorerView(),
      disabled: !activeProject,
    },
    {
      id: 'toggle-sidebar',
      label: sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar',
      run: () => setSidebarOpen(prev => !prev),
      disabled: !activeProject,
    },
    {
      id: 'new-project',
      label: 'Create New Project',
      run: () => createProject(),
    },
    {
      id: 'open-file-device',
      label: 'Open Files From Device',
      run: () => triggerImportFiles(),
    },
    {
      id: 'open-folder-device',
      label: 'Open Folder From Device',
      run: () => triggerImportFolder(),
    },
    {
      id: 'open-settings',
      label: 'Open Settings',
      hint: 'Ctrl+,',
      run: () => openSettingsPanel(),
    },
    {
      id: 'open-extensions',
      label: 'Open Extensions',
      run: () => openExtensionsPanel(),
    },
    {
      id: 'new-window',
      label: 'Open New Window',
      run: () => openNewWindow(),
    },
  ]), [
    activeFile,
    activeProject,
    aiChatOpen,
    createFile,
    createProject,
    deleteFile,
    handleRun,
    handleSave,
    ideSettings.wordWrap,
    openExplorerView,
    openSearchView,
    openBoilerplatePicker,
    renameFile,
    sidebarOpen,
    terminalOpen,
  ]);

  const filteredQuickActions = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return quickActions;
    return quickActions.filter(action =>
      action.label.toLowerCase().includes(query) || action.id.includes(query)
    );
  }, [commandQuery, quickActions]);

  const filteredCommandFiles = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return openFiles.slice(0, 8);
    return files
      .filter(file => file.path.toLowerCase().includes(query))
      .slice(0, 8);
  }, [commandQuery, files, openFiles]);

  const executeQuickAction = (action: QuickAction) => {
    if (action.disabled) return;
    action.run();
    setIsCommandPaletteOpen(false);
    setCommandQuery('');
  };

  const getLanguageExtension = (lang: string) => {
    const extensions = [lintGutter(), ...(ideSettings.wordWrap ? [EditorView.lineWrapping] : [])];
    const normalized = getNormalizedLanguage(lang);
    switch (normalized) {
      case 'javascript': return [...extensions, javascript({ jsx: true })];
      case 'typescript': return [...extensions, javascript({ jsx: true, typescript: true })];
      case 'react': return [...extensions, javascript({ jsx: true })];
      case 'python': return [...extensions, python()];
      case 'html': return [...extensions, html()];
      case 'css': return [...extensions, css()];
      case 'java': return [...extensions, java()];
      case 'cpp': return [...extensions, cpp()];
      case 'c': return [...extensions, cpp()];
      case 'csharp': return [...extensions, java()];
      case 'kotlin': return [...extensions, java()];
      case 'swift': return [...extensions, cpp()];
      case 'php': return [...extensions, php()];
      case 'rust': return [...extensions, rust()];
      case 'sql': return [...extensions, sql()];
      case 'json': return [...extensions, json()];
      case 'markdown': return [...extensions, markdown()];
      case 'xml': return [...extensions, xml()];
      case 'go': return [...extensions, go()];
      case 'yaml': return [...extensions, yaml()];
      case 'sass': return [...extensions, sass()];
      case 'less': return [...extensions, less()];
      case 'angular': return [...extensions, angular()];
      case 'vue': return [...extensions, vue()];
      case 'svelte': return [...extensions, html()];
      case 'liquid': return [...extensions, liquid()];
      case 'wast': return [...extensions, wast()];
      case 'ruby': return [...extensions, python()];
      case 'perl': return [...extensions, php()];
      case 'lua': return [...extensions, javascript()];
      case 'dart': return [...extensions, javascript()];
      case 'r': return [...extensions, python()];
      case 'scala': return [...extensions, java()];
      case 'elixir': return [...extensions, markdown()];
      case 'erlang': return [...extensions, markdown()];
      case 'shell': return [...extensions, markdown()];
      case 'powershell': return [...extensions, markdown()];
      case 'objective-c': return [...extensions, cpp()];
      case 'julia': return [...extensions, python()];
      case 'haskell': return [...extensions, markdown()];
      case 'zig': return [...extensions, cpp()];
      case 'clojure': return [...extensions, javascript()];
      case 'fortran': return [...extensions, cpp()];
      case 'nim': return [...extensions, python()];
      case 'groovy': return [...extensions, java()];
      case 'solidity': return [...extensions, javascript()];
      default: return [...extensions, javascript()];
    }
  };

  const shouldShowSidebar = activeProject ? sidebarOpen : (!isMobileViewport || sidebarOpen);
  const statusBarColor = ideSettings.editorTheme === 'vscode-light' ? '#0e639c' : '#007acc';
  const runMenuAction = (action: () => void) => () => {
    action();
    setActiveTopMenu(null);
  };

  return (
    <div className="flex h-screen w-full bg-[#0d1117] text-gray-300 font-sans overflow-hidden">
      <input
        ref={importFolderInputRef}
        type="file"
        className="hidden"
        multiple
        // @ts-ignore webkitdirectory is supported in Chromium/WebKit based browsers.
        webkitdirectory="true"
        // @ts-ignore directory helps some browsers expose folder picker behavior.
        directory="true"
        onChange={(event) => {
          importBrowserFiles(event.target.files, true);
          event.currentTarget.value = '';
        }}
      />
      <input
        ref={importFilesInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(event) => {
          importBrowserFiles(event.target.files, false);
          event.currentTarget.value = '';
        }}
      />

      {/* Activity Bar (Desktop) */}
      <div className="w-12 bg-[#0d1117] border-r border-gray-800 flex flex-col items-center py-4 gap-4 z-40 hidden md:flex">
        <button
          onClick={openExplorerView}
          className={cn(
            "p-2 rounded-md",
            sidebarView === 'explorer' ? "text-white bg-gray-800" : "text-gray-500 hover:text-white"
          )}
          title="Explorer"
        >
          <Folder className="w-6 h-6" />
        </button>
        <button
          onClick={openSearchView}
          className={cn(
            "p-2 rounded-md",
            sidebarView === 'search' ? "text-white bg-gray-800" : "text-gray-500 hover:text-white"
          )}
          title="Search"
        >
          <Search className="w-6 h-6" />
        </button>
        <button
          onClick={openExtensionsPanel}
          className={cn(
            "p-2 rounded-md",
            isExtensionsOpen ? "text-white bg-gray-800" : "text-gray-500 hover:text-white"
          )}
          title="Extensions"
        >
          <Cpu className="w-6 h-6" />
        </button>
        <button onClick={openSettingsPanel} className="p-2 text-gray-500 hover:text-white" title="Settings">
          <Settings className="w-6 h-6" />
        </button>
        <div className="flex-1" />
        <button className="p-2 text-gray-500 hover:text-white">
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white">U</div>
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {(sidebarOpen && isMobileViewport) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Create Project Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#161b22] border border-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="text-lg font-semibold text-white">Create New Project</h3>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateProjectSubmit} className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Project Name</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="My Awesome Project"
                    className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Language</label>
                  <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setNewProjectLanguage(lang)}
                        className={cn(
                          "px-2 py-2 rounded-lg text-xs font-medium border transition-colors capitalize truncate",
                          newProjectLanguage === lang
                            ? "bg-blue-600/20 border-blue-500 text-blue-400"
                            : "bg-[#0d1117] border-gray-700 text-gray-400 hover:border-gray-600"
                        )}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 p-2 bg-[#0d1117] border border-gray-700 rounded-md">
                    <div className="text-[11px] text-gray-500 mb-1 uppercase">Frameworks</div>
                    <div className="text-xs text-gray-300">
                      {(LANGUAGE_ECOSYSTEM[newProjectLanguage]?.frameworks || []).join(', ') || 'No common framework metadata yet'}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-2 mb-1 uppercase">Libraries</div>
                    <div className="text-xs text-gray-300">
                      {(LANGUAGE_ECOSYSTEM[newProjectLanguage]?.libraries || []).join(', ') || 'No common library metadata yet'}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newProjectName.trim()}
                    className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[58] bg-black/60 backdrop-blur-sm p-4 md:p-8"
            onClick={() => setIsSettingsOpen(false)}
          >
            <motion.div
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              className="max-w-2xl mx-auto bg-[#161b22] border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-lg text-white font-semibold">Settings</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="p-1 rounded hover:bg-[#21262d] text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4 max-h-[72vh] overflow-y-auto">
                <label className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-gray-300">Word Wrap</span>
                  <input
                    type="checkbox"
                    checked={ideSettings.wordWrap}
                    onChange={(e) => setIdeSettings(prev => ({ ...prev, wordWrap: e.target.checked }))}
                  />
                </label>
                <label className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-gray-300">Auto Save</span>
                  <input
                    type="checkbox"
                    checked={ideSettings.autoSave}
                    onChange={(e) => setIdeSettings(prev => ({ ...prev, autoSave: e.target.checked }))}
                  />
                </label>
                <div className="space-y-2">
                  <div className="text-sm text-gray-300">Editor Font Size: {ideSettings.editorFontSize}px</div>
                  <input
                    type="range"
                    min={12}
                    max={22}
                    step={1}
                    value={ideSettings.editorFontSize}
                    onChange={(e) => setIdeSettings(prev => ({ ...prev, editorFontSize: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-300">Terminal Font Size: {ideSettings.terminalFontSize}px</div>
                  <input
                    type="range"
                    min={11}
                    max={20}
                    step={1}
                    value={ideSettings.terminalFontSize}
                    onChange={(e) => setIdeSettings(prev => ({ ...prev, terminalFontSize: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-300">Default Terminal Mode</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setIdeSettings(prev => ({ ...prev, defaultTerminalMode: 'console' }))}
                      className={cn(
                        "px-3 py-2 rounded border text-sm",
                        ideSettings.defaultTerminalMode === 'console'
                          ? "bg-blue-600/20 border-blue-500 text-blue-300"
                          : "bg-[#0d1117] border-gray-700 text-gray-300"
                      )}
                    >
                      Console
                    </button>
                    <button
                      onClick={() => setIdeSettings(prev => ({ ...prev, defaultTerminalMode: 'shell' }))}
                      className={cn(
                        "px-3 py-2 rounded border text-sm",
                        ideSettings.defaultTerminalMode === 'shell'
                          ? "bg-blue-600/20 border-blue-500 text-blue-300"
                          : "bg-[#0d1117] border-gray-700 text-gray-300"
                      )}
                    >
                      Shell
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-300">Editor Theme</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => applyThemeExtension('vscode-dark')}
                      className={cn(
                        "px-3 py-2 rounded border text-sm",
                        ideSettings.editorTheme === 'vscode-dark'
                          ? "bg-blue-600/20 border-blue-500 text-blue-300"
                          : "bg-[#0d1117] border-gray-700 text-gray-300"
                      )}
                    >
                      VS Code Dark
                    </button>
                    <button
                      onClick={() => applyThemeExtension('vscode-light')}
                      className={cn(
                        "px-3 py-2 rounded border text-sm",
                        ideSettings.editorTheme === 'vscode-light'
                          ? "bg-blue-600/20 border-blue-500 text-blue-300"
                          : "bg-[#0d1117] border-gray-700 text-gray-300"
                      )}
                    >
                      VS Code Light
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-700 p-3 bg-[#0d1117] text-xs text-gray-400 space-y-1">
                  <div>Shortcuts:</div>
                  <div>`Ctrl+Shift+P` Command Palette</div>
                  <div>`Ctrl+N` New File</div>
                  <div>`Ctrl+,` Settings</div>
                  <div>`Ctrl+S` Save</div>
                  <div>`Ctrl+Shift+F` Search in Project</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extensions Modal */}
      <AnimatePresence>
        {isExtensionsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[59] bg-black/60 backdrop-blur-sm p-4 md:p-8"
            onClick={() => setIsExtensionsOpen(false)}
          >
            <motion.div
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              className="max-w-3xl mx-auto bg-[#161b22] border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-lg text-white font-semibold">Extensions</h3>
                <button onClick={() => setIsExtensionsOpen(false)} className="p-1 rounded hover:bg-[#21262d] text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-3 max-h-[72vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3">
                {extensionEntries.map(extension => (
                  <div key={extension.id} className="rounded-lg border border-gray-700 bg-[#0d1117] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-white font-medium">{extension.name}</div>
                        <div className="text-[11px] uppercase tracking-wide text-blue-300 mt-0.5">{extension.category}</div>
                      </div>
                      <div className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border",
                        extension.enabled
                          ? "border-emerald-500/50 text-emerald-300"
                          : "border-gray-700 text-gray-500"
                      )}>
                        {extension.enabled ? 'Enabled' : (extension.installed ? 'Installed' : (extension.downloaded ? 'Downloaded' : 'Not Installed'))}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">{extension.description}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        disabled={downloadingExtensionIds.includes(extension.id)}
                        onClick={() => toggleExtensionInstall(extension.id)}
                        className={cn(
                          "px-2.5 py-1.5 rounded text-xs border disabled:opacity-50 disabled:cursor-not-allowed",
                          extension.installed
                            ? "border-red-600/40 text-red-300 hover:bg-red-600/10"
                            : "border-blue-500/40 text-blue-300 hover:bg-blue-500/10"
                        )}
                      >
                        {downloadingExtensionIds.includes(extension.id)
                          ? 'Downloading...'
                          : (extension.installed ? 'Uninstall' : (extension.downloaded ? 'Install' : 'Download + Install'))}
                      </button>
                      <button
                        disabled={!extension.installed}
                        onClick={() => toggleExtensionEnable(extension.id)}
                        className="px-2.5 py-1.5 rounded text-xs border border-gray-700 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#21262d]"
                      >
                        {extension.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command Palette */}
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm p-4 md:p-8"
            onClick={() => setIsCommandPaletteOpen(false)}
          >
            <motion.div
              initial={{ y: -18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -18, opacity: 0 }}
              className="max-w-2xl mx-auto bg-[#161b22] border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="p-3 border-b border-gray-800">
                <input
                  type="text"
                  autoFocus
                  value={commandQuery}
                  onChange={(event) => setCommandQuery(event.target.value)}
                  placeholder="Type a command or file name..."
                  className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="max-h-[65vh] overflow-y-auto p-2">
                <div className="px-2 py-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Commands
                </div>
                {filteredQuickActions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => executeQuickAction(action)}
                    disabled={action.disabled}
                    className={cn(
                      "w-full px-3 py-2 rounded-md text-left flex items-center justify-between transition-colors",
                      action.disabled
                        ? "text-gray-600 cursor-not-allowed"
                        : "text-gray-200 hover:bg-[#21262d]"
                    )}
                  >
                    <span className="text-sm">{action.label}</span>
                    {action.hint && (
                      <span className="text-[11px] text-gray-500">{action.hint}</span>
                    )}
                  </button>
                ))}

                <div className="px-2 py-1 mt-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Files
                </div>
                {filteredCommandFiles.map(file => (
                  <button
                    key={file.id}
                    onClick={() => {
                      openFile(file, true);
                      setIsCommandPaletteOpen(false);
                      setCommandQuery('');
                    }}
                    className="w-full px-3 py-2 rounded-md text-left flex items-center gap-2 text-sm text-gray-300 hover:bg-[#21262d]"
                  >
                    <FileIcon fileName={file.path} />
                    <span className="truncate">{file.path}</span>
                  </button>
                ))}

                {filteredQuickActions.length === 0 && filteredCommandFiles.length === 0 && (
                  <div className="px-3 py-8 text-center text-sm text-gray-500">
                    No commands or files matched.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boilerplate Picker */}
      <AnimatePresence>
        {isBoilerplateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[65] backdrop-blur-sm p-4 md:p-8"
            onClick={() => setIsBoilerplateOpen(false)}
          >
            <motion.div
              initial={{ y: -18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -18, opacity: 0 }}
              className="max-w-3xl mx-auto bg-[#161b22] border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="p-3 border-b border-gray-800">
                <div className="text-xs text-gray-500 mb-2">Type "!" in editor or use this picker to insert boilerplates.</div>
                <input
                  type="text"
                  autoFocus
                  value={boilerplateQuery}
                  onChange={(event) => setBoilerplateQuery(event.target.value)}
                  placeholder="Search boilerplates by language, framework, name..."
                  className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="max-h-[68vh] overflow-y-auto p-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredBoilerplates.map(snippet => (
                  <button
                    key={snippet.id}
                    onClick={() => applyBoilerplateSnippet(snippet)}
                    className="text-left border border-gray-700 bg-[#0d1117] rounded-lg p-3 hover:border-blue-500 hover:bg-[#111927] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-white font-medium">{snippet.title}</div>
                      <div className="text-[11px] text-blue-300 uppercase">{snippet.language}</div>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      {snippet.frameworks.length > 0 ? snippet.frameworks.join(', ') : 'General starter'}
                    </div>
                    <pre className="mt-2 text-[11px] text-gray-400 overflow-hidden text-ellipsis whitespace-pre-wrap line-clamp-4">
                      {snippet.content}
                    </pre>
                  </button>
                ))}
                {filteredBoilerplates.length === 0 && (
                  <div className="col-span-full px-3 py-10 text-center text-sm text-gray-500">
                    No boilerplates matched your search.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {shouldShowSidebar && (
          <motion.div 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className={cn(
              "fixed md:relative z-30 h-full w-[280px] bg-[#161b22] border-r border-gray-800 flex flex-col",
              !activeProject ? "w-full md:w-[350px]" : ""
            )}
          >
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-700 bg-[#0d1117]">
                  <img
                    src="/1.jpg?v=velo8"
                    alt="VElo Code logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-white leading-none">VElo Code</span>
                  <span className="text-[10px] text-blue-400 font-mono">code likes your bro</span>
                </div>
              </div>
              {isMobileViewport && (
                <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 hover:bg-gray-800 rounded">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {!activeProject ? (
                <div className="space-y-4 p-2">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Projects</h2>
                    <button 
                      onClick={createProject}
                      className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {projects.map(p => (
                        <div 
                          key={p.id}
                          onClick={() => {
                            setActiveProject(p);
                            setSidebarView('explorer');
                            if (window.innerWidth < 768) setSidebarOpen(false);
                          }}
                        className="p-3 bg-[#21262d] hover:bg-[#30363d] rounded-lg cursor-pointer border border-gray-700/50 transition-all group"
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-gray-200 group-hover:text-blue-400">{p.name}</h3>
                          <span className="text-xs px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">{p.language}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 truncate">{p.description}</p>
                        <div className="text-[10px] text-gray-600 mt-2">
                          Last edited: {new Date(p.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                    {projects.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No projects yet. Create one to start coding!
                      </div>
                    )}
                  </div>
                </div>
              ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
              {landingView === 'home' ? (
                <>
                  <div className="rounded-2xl border border-gray-800 bg-gradient-to-b from-[#161b22] via-[#0f1724] to-[#0b111a] p-6 md:p-8 shadow-2xl">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden border border-gray-700 bg-[#0d1117] shadow-xl mb-4">
                        <img
                          src="/1.jpg?v=velo8"
                          alt="Velo Code"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-blue-300/90 mb-2">Start</p>
                      <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Welcome to VElo Code</h1>
                      <p className="text-gray-400 max-w-2xl">
                        VS Code inspired quick start for mobile and desktop. Pick an action and start coding instantly.
                      </p>

                      <button
                        onClick={() => setLandingView('download')}
                        className="mt-5 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                        Start With VElo Code
                      </button>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={createProject}
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        New Project
                      </button>
                      <button
                        onClick={createQuickWorkspaceWithFile}
                        className="w-full px-4 py-3 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <FilePlus className="w-5 h-5" />
                        Create File
                      </button>
                      <button
                        onClick={triggerImportFolder}
                        className="w-full px-4 py-3 bg-[#21262d] hover:bg-[#30363d] text-gray-100 rounded-lg font-medium transition-colors border border-gray-700 flex items-center justify-center gap-2"
                      >
                        <Folder className="w-5 h-5" />
                        Open Folder
                      </button>
                      <button
                        onClick={() => setAiChatOpen(true)}
                        className="w-full px-4 py-3 bg-[#21262d] hover:bg-[#30363d] text-gray-100 rounded-lg font-medium transition-colors border border-gray-700 flex items-center justify-center gap-2"
                      >
                        <Bot className="w-5 h-5" />
                        Ask AI
                      </button>
                      <button
                        onClick={openExtensionsPanel}
                        className="w-full px-4 py-3 bg-[#21262d] hover:bg-[#30363d] text-gray-100 rounded-lg font-medium transition-colors border border-gray-700 flex items-center justify-center gap-2"
                      >
                        <Cpu className="w-5 h-5" />
                        Extensions
                      </button>
                      <button
                        onClick={openSettingsPanel}
                        className="w-full px-4 py-3 bg-[#21262d] hover:bg-[#30363d] text-gray-100 rounded-lg font-medium transition-colors border border-gray-700 flex items-center justify-center gap-2"
                      >
                        <Settings className="w-5 h-5" />
                        Settings
                      </button>
                    </div>
                  </div>

                  {projects.length > 0 && (
                    <div className="mt-5 rounded-xl border border-gray-800 bg-[#11161d] p-4">
                      <h2 className="text-sm font-semibold text-gray-300 mb-3">Recent Projects</h2>
                      <div className="space-y-2">
                        {projects.slice(0, 4).map(project => (
                          <button
                            key={project.id}
                            onClick={() => {
                              setActiveProject(project);
                              setSidebarView('explorer');
                              if (isMobileViewport) setSidebarOpen(false);
                            }}
                            className="w-full px-3 py-2 rounded-md border border-gray-800 bg-[#161b22] hover:bg-[#1d2430] text-left transition-colors"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm text-gray-200 truncate">{project.name}</span>
                              <span className="text-[10px] uppercase text-blue-300">{project.language}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-gray-800 bg-gradient-to-b from-[#151c2b] via-[#101829] to-[#0b1220] p-6 md:p-8 shadow-2xl">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <button
                      onClick={() => setLandingView('home')}
                      className="px-3 py-2 rounded-lg border border-gray-700 bg-[#0d1117] text-gray-300 hover:text-white hover:bg-[#18202e] text-sm flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back To Start
                    </button>
                    <div className="text-xs text-blue-300 uppercase tracking-[0.2em]">Download Center</div>
                  </div>

                  <div className="mt-5 text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-white">Download VElo Code IDE</h2>
                    <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
                      Choose your platform package. Android and Windows offer flow is ready now. Apple/Linux variants are marked coming soon.
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-200 font-semibold"><Smartphone className="w-4 h-4" /> Android</div>
                        <span className="text-[10px] uppercase tracking-wide text-emerald-200">APK</span>
                      </div>
                      <p className="text-xs text-emerald-100/80 mt-2">Mobile installer package for Android devices.</p>
                      <button onClick={() => triggerPlatformDownload('Android', '.apk')} className="mt-3 w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium">
                        Download .apk
                      </button>
                    </div>

                    <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-blue-200 font-semibold"><Monitor className="w-4 h-4" /> Windows</div>
                        <span className="text-[10px] uppercase tracking-wide text-blue-200">EXE</span>
                      </div>
                      <p className="text-xs text-blue-100/80 mt-2">Desktop installer package for Windows machines.</p>
                      <button onClick={() => triggerPlatformDownload('Windows', '.exe')} className="mt-3 w-full px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
                        Download .exe
                      </button>
                    </div>

                    <div className="rounded-xl border border-gray-700 bg-[#0d1117] p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-200 font-semibold"><Apple className="w-4 h-4" /> xOS / macOS</div>
                        <span className="text-[10px] uppercase tracking-wide text-yellow-300">Coming Soon</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Native mac build will be available shortly.</p>
                    </div>

                    <div className="rounded-xl border border-gray-700 bg-[#0d1117] p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-200 font-semibold"><Apple className="w-4 h-4" /> iOS</div>
                        <span className="text-[10px] uppercase tracking-wide text-yellow-300">Coming Soon</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">iOS delivery option will be added in upcoming release.</p>
                    </div>

                    <div className="rounded-xl border border-gray-700 bg-[#0d1117] p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-200 font-semibold"><Linux className="w-4 h-4" /> Ubuntu</div>
                        <span className="text-[10px] uppercase tracking-wide text-yellow-300">Coming Soon</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Ubuntu .deb package pipeline is in progress.</p>
                    </div>

                    <div className="rounded-xl border border-gray-700 bg-[#0d1117] p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-200 font-semibold"><Shield className="w-4 h-4" /> Kali Linux</div>
                        <span className="text-[10px] uppercase tracking-wide text-yellow-300">Coming Soon</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Kali-compatible package will be published soon.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* AI Chat Overlay */}
        <AnimatePresence>
          {aiChatOpen && isExtensionEnabled('ai-chat-assistant') && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              className="absolute inset-y-0 right-0 w-full md:w-[350px] bg-[#161b22] border-l border-gray-800 z-40 flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#161b22]">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <Bot className="w-5 h-5 text-purple-400" />
                    AI Assistant
                  </div>
                  <button
                    onClick={() => setIsAiAgentMode(prev => !prev)}
                    disabled={!isExtensionEnabled('ai-agent')}
                    className={cn(
                      "text-[10px] px-2 py-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed",
                      isAiAgentMode
                        ? "border-green-500/50 text-green-300 bg-green-500/10"
                        : "border-gray-700 text-gray-400"
                    )}
                    title="Toggle AI agent mode"
                  >
                    {isAiAgentMode ? 'Agent ON' : 'Agent OFF'}
                  </button>
                </div>
                <button onClick={() => setAiChatOpen(false)} className="p-1 hover:bg-gray-800 rounded text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 mt-10 text-sm">
                    {isAiAgentMode
                      ? 'Tell me tasks like: create a new file, build a program, or update existing code.'
                      : 'Ask me anything about your code!'}
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      msg.role === 'user' ? "bg-blue-600" : "bg-purple-600"
                    )}>
                      {msg.role === 'user' ? 'U' : <Bot className="w-4 h-4 text-white" />}
                    </div>
                    <div className={cn(
                      "rounded-lg p-3 text-sm max-w-[80%]",
                      msg.role === 'user' ? "bg-blue-600/20 text-blue-100" : "bg-gray-800 text-gray-200"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAiLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-400 animate-pulse">
                      Thinking...
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-800 bg-[#161b22]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiChat()}
                    placeholder={isAiAgentMode ? "Ask agent: e.g. create login.py with auth flow" : "Ask AI..."}
                    className="flex-1 bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <button 
                    onClick={handleAiChat}
                    disabled={isAiLoading || !aiInput.trim()}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  hint,
  disabled,
}: {
  label: string;
  onClick: () => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full text-left px-2.5 py-1.5 rounded text-[12px] flex items-center justify-between",
        disabled
          ? "text-gray-600 cursor-not-allowed"
          : "text-gray-200 hover:bg-[#21262d]"
      )}
    >
      <span>{label}</span>
      {hint && <span className="text-[10px] text-gray-500">{hint}</span>}
    </button>
  );
}

function FileIcon({ fileName }: { fileName: string }) {
  if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return <span className="text-yellow-400 font-bold text-[10px]">JS</span>;
  if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return <span className="text-blue-400 font-bold text-[10px]">TS</span>;
  if (fileName.endsWith('.py')) return <span className="text-blue-300 font-bold text-[10px]">PY</span>;
  if (fileName.endsWith('.html')) return <span className="text-orange-400 font-bold text-[10px]">&lt;&gt;</span>;
  if (fileName.endsWith('.css')) return <span className="text-blue-300 font-bold text-[10px]">#</span>;
  if (fileName.endsWith('.java')) return <span className="text-red-400 font-bold text-[10px]">JV</span>;
  if (fileName.endsWith('.cpp') || fileName.endsWith('.c') || fileName.endsWith('.h')) return <span className="text-blue-600 font-bold text-[10px]">C++</span>;
  if (fileName.endsWith('.php')) return <span className="text-purple-400 font-bold text-[10px]">PHP</span>;
  if (fileName.endsWith('.rs')) return <span className="text-orange-600 font-bold text-[10px]">RS</span>;
  if (fileName.endsWith('.sql')) return <span className="text-blue-300 font-bold text-[10px]">SQL</span>;
  if (fileName.endsWith('.json')) return <span className="text-yellow-200 font-bold text-[10px]">{}</span>;
  if (fileName.endsWith('.md')) return <span className="text-gray-300 font-bold text-[10px]">MD</span>;
  if (fileName.endsWith('.xml')) return <span className="text-orange-300 font-bold text-[10px]">XML</span>;
  if (fileName.endsWith('.go')) return <span className="text-cyan-400 font-bold text-[10px]">GO</span>;
  if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) return <span className="text-red-300 font-bold text-[10px]">YML</span>;
  if (fileName.endsWith('.scss') || fileName.endsWith('.sass')) return <span className="text-pink-400 font-bold text-[10px]">SASS</span>;
  if (fileName.endsWith('.less')) return <span className="text-blue-800 font-bold text-[10px]">LESS</span>;
  if (fileName.endsWith('.vue')) return <span className="text-green-400 font-bold text-[10px]">VUE</span>;
  if (fileName.endsWith('.svelte')) return <span className="text-orange-400 font-bold text-[10px]">SVE</span>;
  if (fileName.endsWith('.liquid')) return <span className="text-green-600 font-bold text-[10px]">LIQ</span>;
  if (fileName.endsWith('.wat') || fileName.endsWith('.wasm')) return <span className="text-purple-500 font-bold text-[10px]">WASM</span>;
  if (fileName.endsWith('.c')) return <span className="text-blue-600 font-bold text-[10px]">C</span>;
  if (fileName.endsWith('.cs')) return <span className="text-green-300 font-bold text-[10px]">C#</span>;
  if (fileName.endsWith('.kt')) return <span className="text-purple-300 font-bold text-[10px]">KT</span>;
  if (fileName.endsWith('.swift')) return <span className="text-orange-500 font-bold text-[10px]">SW</span>;
  if (fileName.endsWith('.rb')) return <span className="text-red-500 font-bold text-[10px]">RB</span>;
  if (fileName.endsWith('.pl')) return <span className="text-cyan-400 font-bold text-[10px]">PL</span>;
  if (fileName.endsWith('.lua')) return <span className="text-blue-300 font-bold text-[10px]">LUA</span>;
  if (fileName.endsWith('.dart')) return <span className="text-cyan-300 font-bold text-[10px]">D</span>;
  if (fileName.endsWith('.r')) return <span className="text-blue-300 font-bold text-[10px]">R</span>;
  if (fileName.endsWith('.scala')) return <span className="text-red-400 font-bold text-[10px]">SC</span>;
  if (fileName.endsWith('.ex') || fileName.endsWith('.exs')) return <span className="text-purple-400 font-bold text-[10px]">EX</span>;
  if (fileName.endsWith('.erl')) return <span className="text-red-300 font-bold text-[10px]">ERL</span>;
  if (fileName.endsWith('.sh')) return <span className="text-green-300 font-bold text-[10px]">SH</span>;
  if (fileName.endsWith('.ps1')) return <span className="text-blue-200 font-bold text-[10px]">PS</span>;
  if (fileName.endsWith('.m')) return <span className="text-gray-300 font-bold text-[10px]">M</span>;
  if (fileName.endsWith('.jl')) return <span className="text-purple-300 font-bold text-[10px]">JL</span>;
  if (fileName.endsWith('.hs')) return <span className="text-purple-400 font-bold text-[10px]">HS</span>;
  if (fileName.endsWith('.zig')) return <span className="text-yellow-300 font-bold text-[10px]">ZIG</span>;
  if (fileName.endsWith('.clj')) return <span className="text-green-400 font-bold text-[10px]">CLJ</span>;
  if (fileName.endsWith('.f90') || fileName.endsWith('.f95')) return <span className="text-blue-500 font-bold text-[10px]">F</span>;
  if (fileName.endsWith('.nim')) return <span className="text-yellow-400 font-bold text-[10px]">NIM</span>;
  if (fileName.endsWith('.groovy')) return <span className="text-green-300 font-bold text-[10px]">GV</span>;
  if (fileName.endsWith('.sol')) return <span className="text-gray-300 font-bold text-[10px]">SOL</span>;
  return <Folder className="w-4 h-4 text-blue-400" />;
}




