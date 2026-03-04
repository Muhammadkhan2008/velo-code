export interface FeatureGroup {
  id: string;
  title: string;
  description: string;
  points: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const seoMetadata = {
  title: 'Velo Code | Browser-Based IDE with AI, Terminal, and Extension Runners',
  description:
    'Velo Code is a browser-based, mobile-friendly IDE with project workspaces, multi-tab editing, extension-driven run architecture, AI assistant tools, and PWA support.',
  keywords: [
    'browser based IDE',
    'mobile friendly IDE',
    'project workspace code editor',
    'AI coding assistant IDE',
    'extension driven code runner',
    'Pyodide Python runner',
    'web terminal IDE',
    'PWA code editor',
    'multi tab online editor',
    'developer documentation IDE',
  ],
};

export const heroCopy = {
  badge: 'Browser IDE with desktop-like workflow',
  headline: 'Build, run, and manage full coding projects from any browser.',
  subheadline:
    'Velo Code gives you a project-based workspace, multi-tab editing, extension-powered execution, built-in terminal controls, and AI assistance in one responsive interface.',
  primaryCta: 'Start With Velo Code',
  secondaryCta: 'Read Full Documentation',
};

export const whyVeloCode = [
  {
    title: 'Desktop-style structure',
    description:
      'Use a familiar top menu, file explorer, status bar, command palette, and keyboard shortcuts that mirror standard IDE workflows.',
  },
  {
    title: 'Practical run model',
    description:
      'Run browser-safe files directly in the editor and route compiled or interpreter-based languages through server runtimes when available.',
  },
  {
    title: 'Mobile-ready without compromise',
    description:
      'Work on desktop or phone with responsive layouts, mobile bottom navigation, and a first-launch experience tuned for smaller screens.',
  },
];

export const featureGroups: FeatureGroup[] = [
  {
    id: 'editor',
    title: 'Editor',
    description: 'Daily coding controls expected from a modern IDE.',
    points: [
      'Project file explorer with create, rename, and delete actions',
      'Desktop-style top menu: File, Edit, Selection, View, Run, Go, Terminal, Extensions',
      'Multi-tab editing, syntax support for many languages, and snippet insertion including "!" style behavior',
      'Integrated status bar and quick actions, plus word wrap toggle, font-size controls, autosave, and theme support (VS Code Dark, VS Code Light, and extension themes)',
    ],
  },
  {
    id: 'run',
    title: 'Run',
    description: 'Extension-driven execution with clear fallback behavior.',
    points: [
      'Browser runners for HTML, CSS, JavaScript, TypeScript-lite, Python via Pyodide, JSON, Markdown, and basic YAML/XML/SQL validation',
      'Server runtime runners for Java, C, C++, Go, Rust, Swift, PHP, Ruby, Shell, and PowerShell when runtime is available',
      'If runtime is missing, Velo Code returns explicit error messaging instead of silent failures',
    ],
  },
  {
    id: 'ai',
    title: 'AI',
    description: 'AI support for coding assistance and project operations.',
    points: [
      'AI chat assistant for coding help and navigation guidance',
      'AI agent mode that can create, update, rename, delete, and open files',
      'Code completion plus analysis and lint assistance based on project context',
    ],
  },
  {
    id: 'terminal',
    title: 'Terminal',
    description: 'Built-in command workflow without switching tools.',
    points: [
      'Integrated shell terminal with run and stop controls',
      'Command history for repeated workflows',
      'Preset command shortcuts including npm install, npm run dev, pip install, and npx create-vite',
    ],
  },
  {
    id: 'extensions',
    title: 'Extensions',
    description: 'Controlled extension lifecycle in a local package model.',
    points: [
      'Extension panel with 20+ extensions',
      'Download, install, enable, and disable states',
      'Category support for runner, theme, AI, and tools with local manifest and catalog architecture',
    ],
  },
  {
    id: 'mobile',
    title: 'Mobile + PWA',
    description: 'Portable access and installable behavior.',
    points: [
      'Responsive UI for desktop and mobile with optimized bottom navigation on phones',
      'Welcome/start screen tuned for mobile first launch',
      'Installable PWA with offline-friendly caching for front-end assets',
    ],
  },
];

export const howItWorksSteps = [
  {
    title: '1) Start a workspace',
    description:
      'Create a new project, open files from your device, or import a folder. Use the file explorer to structure your project quickly.',
  },
  {
    title: '2) Edit with IDE controls',
    description:
      'Work in multiple tabs, use global search/replace, access command palette actions, and tune editor preferences in settings.',
  },
  {
    title: '3) Run with the matching runner',
    description:
      'Velo Code routes each file to the correct browser runner or server runtime runner based on extension and runtime availability.',
  },
  {
    title: '4) Iterate using AI and terminal',
    description:
      'Use the AI assistant and agent mode for project-level edits, then run commands in the integrated terminal for install/build/test loops.',
  },
];

export const executionArchitecture = {
  intro:
    'Execution in Velo Code is extension-driven. Each runner declares supported file types and execution strategy.',
  browserRunners: [
    'HTML preview in an iframe',
    'CSS preview document renderer',
    'JavaScript browser execution',
    'TypeScript-lite execution',
    'Python execution via Pyodide',
    'JSON validation and format',
    'Markdown preview',
    'YAML/XML/SQL basic validation',
  ],
  serverRunners: ['Java', 'C', 'C++', 'Go', 'Rust', 'Swift', 'PHP', 'Ruby', 'Shell', 'PowerShell'],
  pipeline: [
    'Runner resolver reads file extension and checks installed runner extension',
    'Execution engine dispatches to browser runtime or server runtime',
    'Status bar reports run state and quick actions',
    'Error layer reports missing runtime or toolchain requirements clearly',
  ],
};

export const audienceCards = [
  {
    title: 'Students and new developers',
    description: 'Start coding without heavyweight setup, while still learning standard IDE workflows.',
  },
  {
    title: 'Frontend teams',
    description: 'Use browser-native previews, quick snippets, and multi-device access for rapid UI iteration.',
  },
  {
    title: 'Backend and polyglot learners',
    description: 'Switch across languages and run paths using extension-driven routing with explicit runtime feedback.',
  },
  {
    title: 'Training and workshop programs',
    description: 'Provide consistent, install-light coding environments on managed or mixed hardware.',
  },
];

export const faqItems: FaqItem[] = [
  {
    question: 'Is Velo Code only for browser languages?',
    answer:
      'No. Browser-native runners handle web and lightweight formats, while compiled/interpreter languages can run through server runtime runners when the required runtime is available.',
  },
  {
    question: 'Which file types can run directly in the browser?',
    answer:
      'HTML, CSS, JavaScript, TypeScript-lite, Python through Pyodide, JSON, Markdown, plus basic YAML/XML/SQL validation workflows.',
  },
  {
    question: 'What happens if Java, Go, or another runtime is not installed?',
    answer:
      'The run request fails with clear runtime-missing messaging so users know what is required instead of getting silent or ambiguous output.',
  },
  {
    question: 'Does the AI agent edit files automatically?',
    answer:
      'AI agent mode can perform file operations (create, update, rename, delete, open) from project context, while users remain in control of the workflow.',
  },
  {
    question: 'Can I use terminal presets for common setup commands?',
    answer:
      'Yes. Velo Code includes preset commands such as npm install, npm run dev, pip install, and npx create-vite, plus command history and run/stop controls.',
  },
  {
    question: 'How many extensions are available?',
    answer:
      'The extension panel includes 20+ extensions with install and enable/disable states, organized by runner, theme, AI, and tools categories.',
  },
  {
    question: 'Can I import existing project folders from my device?',
    answer:
      'Yes. You can open files directly, import folders, and use the open-new-window action when you want isolated workspace sessions.',
  },
  {
    question: 'Is Velo Code usable on mobile devices?',
    answer:
      'Yes. The interface is responsive, includes mobile bottom navigation for key actions, and has a mobile-first welcome/start experience.',
  },
  {
    question: 'Does Velo Code support offline behavior?',
    answer: 'Yes. As an installable PWA, it uses offline-friendly caching for front-end assets.',
  },
];

export const finalCta = {
  heading: 'Ship faster setup, keep familiar IDE behavior.',
  body: 'Explore the documentation bundle, map runners to your language stack, and publish your Velo Code website with accurate product messaging.',
  primary: 'Open Documentation Bundle',
  secondary: 'Prepare Screenshot Assets',
};
