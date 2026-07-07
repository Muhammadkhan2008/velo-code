export type ExtensionCategory = 'runner' | 'theme' | 'ai' | 'tools' | 'language';

export interface ExtensionCatalogEntry {
  id: string;
  name: string;
  description: string;
  category: ExtensionCategory;
  downloadPath: string;
  runnerMode?: 'browser' | 'server' | 'none';
  languages?: string[];
  /** Real packages installed via `apk add` inside Alpine when running as the Android app. */
  alpinePackages?: string[];
}

export interface ExtensionStateEntry {
  installed: boolean;
  enabled: boolean;
  downloaded: boolean;
}

export type ExtensionStateMap = Record<string, ExtensionStateEntry>;

export interface ResolvedExtensionEntry extends ExtensionCatalogEntry, ExtensionStateEntry {}
