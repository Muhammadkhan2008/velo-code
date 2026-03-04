export interface DocSnippet {
  title: string;
  language: string;
  code: string;
}

export interface DocSection {
  heading: string;
  body: string;
  bullets?: string[];
  snippet?: DocSnippet;
}

export interface DocArticle {
  slug: string;
  title: string;
  summary: string;
  sections: DocSection[];
  recommendedScreenshots: string[];
}

export interface ScreenshotSlot {
  fileName: string;
  title: string;
  purpose: string;
}

export const screenshotSlots: ScreenshotSlot[] = [
  {
    fileName: '01-home-hero.png',
    title: 'Home Hero',
    purpose: 'Primary value statement and CTA area.',
  },
  {
    fileName: '02-workspace-file-explorer.png',
    title: 'Workspace Explorer',
    purpose: 'Project tree with create, rename, and delete actions.',
  },
  {
    fileName: '03-editor-multi-tab.png',
    title: 'Editor Multi-Tab',
    purpose: 'Code editing with tabs, syntax highlighting, and status bar.',
  },
  {
    fileName: '04-command-palette.png',
    title: 'Command Palette',
    purpose: 'Fast action search with keyboard-centric workflow.',
  },
  {
    fileName: '05-run-browser-runners.png',
    title: 'Browser Runners',
    purpose: 'HTML/CSS/JS/Python or validation execution example.',
  },
  {
    fileName: '06-run-server-runtime.png',
    title: 'Server Runtime Runner',
    purpose: 'Compiled language run output with runtime status.',
  },
  {
    fileName: '07-terminal-panel.png',
    title: 'Terminal Panel',
    purpose: 'Built-in terminal with run/stop and command history.',
  },
  {
    fileName: '08-ai-assistant-agent.png',
    title: 'AI Assistant + Agent',
    purpose: 'Project-context chat and file operation workflow.',
  },
  {
    fileName: '09-extension-marketplace.png',
    title: 'Extension Panel',
    purpose: 'Install and enable/disable extension states.',
  },
  {
    fileName: '10-mobile-navigation.png',
    title: 'Mobile Navigation',
    purpose: 'Responsive layout with bottom navigation.',
  },
  {
    fileName: '11-settings-panel.png',
    title: 'Settings Panel',
    purpose: 'Editor, terminal, and theme preferences.',
  },
  {
    fileName: '12-welcome-screen-pwa.png',
    title: 'Welcome + PWA',
    purpose: 'First-launch mobile welcome and install prompt.',
  },
];

export const docsContent: DocArticle[] = [
  {
    slug: 'workspace-and-files',
    title: 'Workspace and File Management',
    summary:
      'Understand project-based workflow, file explorer operations, and import options in Velo Code.',
    sections: [
      {
        heading: 'Project-Based Workspace',
        body: 'Each project opens as a workspace with file explorer, multi-tab editing, integrated status bar quick actions, and a desktop-like top menu.',
        bullets: [
          'Create, rename, and delete files from the file explorer',
          'Top menu layout: File, Edit, Selection, View, Run, Go, Terminal, Extensions',
          'Open multiple files at once using tab-based editing',
          'Use quick actions to keep project operations in one view',
        ],
      },
      {
        heading: 'Global Search and Replace',
        body: 'Search across all project files and apply replace actions at workspace scope.',
        snippet: {
          title: 'Search Workflow',
          language: 'text',
          code: 'Ctrl+Shift+F  -> Search in files\nCtrl+Shift+H  -> Replace in files\nCtrl+P         -> Quick file open',
        },
      },
      {
        heading: 'Import and Session Actions',
        body: 'Bring existing work into Velo Code from your device and separate sessions with new window actions.',
        bullets: ['Open files from device', 'Open folder import from device', 'Open new window for parallel workspace'],
      },
    ],
    recommendedScreenshots: ['02-workspace-file-explorer.png', '03-editor-multi-tab.png', '04-command-palette.png'],
  },
  {
    slug: 'editor-controls-and-themes',
    title: 'Editor Controls, Snippets, and Themes',
    summary: 'Configure editing behavior and appearance while keeping a desktop-like coding flow.',
    sections: [
      {
        heading: 'Editing Controls',
        body: 'The editor supports syntax for many languages, autosave behavior, and font-size controls for readability.',
        bullets: ['Word wrap toggle', 'Autosave', 'Editor font size controls', 'Multi-tab editing'],
      },
      {
        heading: 'Snippet and Boilerplate Insertion',
        body: 'Insert reusable structures quickly using snippet support, including "!" shortcut style expansion patterns.',
        snippet: {
          title: 'Sample HTML Snippet Expansion',
          language: 'html',
          code: '! -> <!doctype html>\n<html lang="en">\n  <head></head>\n  <body></body>\n</html>',
        },
      },
      {
        heading: 'Theme System',
        body: 'Use built-in VS Code Dark and VS Code Light themes, then extend appearance with theme extensions.',
      },
    ],
    recommendedScreenshots: ['03-editor-multi-tab.png', '11-settings-panel.png'],
  },
  {
    slug: 'run-system-and-execution',
    title: 'Run System and Execution Model',
    summary:
      'Learn how extension-driven execution routes files to browser runners or server runtime runners with runtime checks.',
    sections: [
      {
        heading: 'Extension-Driven Architecture',
        body: 'Each run extension defines supported extensions and execution strategy. Velo Code resolves the runner before dispatch.',
        snippet: {
          title: 'Runner Manifest Shape',
          language: 'json',
          code: '{\n  "name": "python-runner",\n  "category": "runner",\n  "supports": [".py"],\n  "mode": "browser",\n  "engine": "pyodide"\n}',
        },
      },
      {
        heading: 'Browser Runners',
        body: 'Medium-size and browser-safe workflows execute inside the client environment.',
        bullets: [
          'HTML via iframe preview',
          'CSS preview document',
          'JavaScript browser execution',
          'TypeScript-lite execution',
          'Python via Pyodide',
          'JSON validation and formatting',
          'Markdown preview',
          'YAML/XML/SQL basic validation',
        ],
      },
      {
        heading: 'Server Runtime Runners',
        body: 'Compiled and interpreter-based languages can execute via server runtime when required toolchain/runtime exists.',
        bullets: ['Java, C, C++, Go, Rust, Swift, PHP, Ruby, Shell, PowerShell'],
      },
      {
        heading: 'Missing Runtime Behavior',
        body: 'If runtime is unavailable, users receive clear, actionable error messaging to avoid hidden failures.',
      },
    ],
    recommendedScreenshots: ['05-run-browser-runners.png', '06-run-server-runtime.png'],
  },
  {
    slug: 'terminal-workflow',
    title: 'Terminal Workflow',
    summary: 'Use built-in shell features to run common commands without leaving the IDE.',
    sections: [
      {
        heading: 'Terminal Core',
        body: 'Terminal includes command run/stop controls and command history for repeatable workflows.',
      },
      {
        heading: 'Preset Command Shortcuts',
        body: 'Bootstrap common project tasks quickly using predefined command actions.',
        snippet: {
          title: 'Example Presets',
          language: 'bash',
          code: 'npm install\nnpm run dev\npip install -r requirements.txt\nnpx create-vite',
        },
      },
    ],
    recommendedScreenshots: ['07-terminal-panel.png'],
  },
  {
    slug: 'ai-assistant-and-agent',
    title: 'AI Assistant, Agent Mode, and Analysis',
    summary: 'Apply AI chat, project-context agent actions, completion, and analysis tools in daily coding cycles.',
    sections: [
      {
        heading: 'AI Chat Assistant',
        body: 'Ask for architecture guidance, code explanations, and troubleshooting help while working inside the project.',
      },
      {
        heading: 'Agent Mode for File Operations',
        body: 'Agent mode can create, update, rename, delete, and open files based on project context.',
        snippet: {
          title: 'Agent Request Example',
          language: 'text',
          code: 'Update src/routes.ts to add /health endpoint and create tests/routes.health.spec.ts',
        },
      },
      {
        heading: 'Completion and Analysis',
        body: 'AI-assisted completion plus lint and analysis suggestions help reduce context switching during edits.',
      },
    ],
    recommendedScreenshots: ['08-ai-assistant-agent.png'],
  },
  {
    slug: 'extensions-and-local-packages',
    title: 'Extensions and Local Package Architecture',
    summary: 'Manage install state and extension categories with a local folder plus manifest/catalog pattern.',
    sections: [
      {
        heading: 'Extension Panel Lifecycle',
        body: 'Browse 20+ extensions and control download/install/enable/disable states from one panel.',
        bullets: ['Categories: runner, theme, AI, tools'],
      },
      {
        heading: 'Local Package Structure',
        body: 'Extensions are organized as local folders with metadata in manifest/catalog style files.',
        snippet: {
          title: 'Local Extension Layout',
          language: 'text',
          code: 'extensions/\n  python-runner/\n    manifest.json\n    index.js\n  theme-vscode-light/\n    manifest.json\ncatalog.json',
        },
      },
    ],
    recommendedScreenshots: ['09-extension-marketplace.png'],
  },
  {
    slug: 'settings-and-preferences',
    title: 'Settings and Preferences',
    summary: 'Configure editor and terminal defaults from the built-in settings panel.',
    sections: [
      {
        heading: 'Supported Settings Controls',
        body: 'Settings panel is fully operational for frequently changed controls.',
        bullets: [
          'Word wrap',
          'Autosave',
          'Editor font size',
          'Terminal font size',
          'Default terminal mode',
          'Theme',
        ],
      },
      {
        heading: 'Settings Example',
        body: 'Store and apply workspace defaults to align team behavior.',
        snippet: {
          title: 'Settings Snapshot',
          language: 'json',
          code: '{\n  "wordWrap": true,\n  "autosave": true,\n  "editorFontSize": 14,\n  "terminalFontSize": 13,\n  "defaultTerminalMode": "shell",\n  "theme": "vs-code-dark"\n}',
        },
      },
    ],
    recommendedScreenshots: ['11-settings-panel.png'],
  },
  {
    slug: 'mobile-pwa-and-launch',
    title: 'Mobile Experience, PWA, and First Launch',
    summary: 'Deliver a consistent coding experience across desktop and mobile with installable offline-friendly behavior.',
    sections: [
      {
        heading: 'Responsive Mobile UI',
        body: 'Mobile layouts adapt editor interactions and include bottom navigation for key actions.',
      },
      {
        heading: 'Welcome and Start Screen',
        body: 'First launch on mobile uses a welcome/start flow designed for quick orientation.',
      },
      {
        heading: 'PWA Install and Offline Caching',
        body: 'Velo Code is installable and caches front-end assets for offline-friendly usage.',
      },
    ],
    recommendedScreenshots: ['10-mobile-navigation.png', '12-welcome-screen-pwa.png'],
  },
];
