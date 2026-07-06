import type { PluginListenerHandle } from '@capacitor/core';

export interface TerminalStatus {
  /** True when the Alpine rootfs is downloaded and extracted. */
  alpineInstalled: boolean;
  /** True when the bundled proot binary is present and executable. */
  prootAvailable: boolean;
  /** Device ABI, e.g. arm64-v8a. */
  abi: string;
  /** Alpine arch resolved from the ABI, e.g. aarch64. */
  alpineArch: string;
  /** True while a setup download/extract is in progress. */
  installing: boolean;
}

export interface SetupProgressEvent {
  phase: 'downloading' | 'extracting' | 'configuring' | 'done' | 'error';
  message: string;
  /** 0-100 when known, -1 when indeterminate. */
  percent: number;
}

export interface StartJobOptions {
  command: string;
  /** Working directory inside Alpine (defaults to /root) or on the host fallback shell. */
  cwd?: string;
  /** Force the plain Android shell instead of Alpine proot. */
  hostShell?: boolean;
}

export interface JobState {
  id: string;
  output: string[];
  done: boolean;
  code: number | null;
  startedAt: number;
  /** 'alpine' when running inside proot, 'host' for the fallback shell. */
  backend: 'alpine' | 'host';
}

export interface VeloTerminalPlugin {
  /** Current install/availability status. */
  status(): Promise<TerminalStatus>;
  /** Download + extract the Alpine minirootfs (idempotent). Emits setupProgress events. */
  setupAlpine(): Promise<TerminalStatus>;
  /** Remove the Alpine rootfs so it can be re-installed fresh. */
  resetAlpine(): Promise<TerminalStatus>;
  /** Start a command job. Uses Alpine proot when installed, otherwise the host shell. */
  startJob(options: StartJobOptions): Promise<{ jobId: string; backend: 'alpine' | 'host' }>;
  /** Poll a job for buffered output. */
  pollJob(options: { id: string }): Promise<JobState>;
  /** Send a line to the job's stdin. */
  writeJob(options: { id: string; data: string }): Promise<void>;
  /** Kill a running job. */
  stopJob(options: { id: string }): Promise<{ id: string; done: boolean }>;
  /** Remove a finished job from the registry. */
  removeJob(options: { id: string }): Promise<void>;
  addListener(
    eventName: 'setupProgress',
    listenerFunc: (event: SetupProgressEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export declare const VeloTerminal: VeloTerminalPlugin;
