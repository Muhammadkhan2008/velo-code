import { Capacitor, registerPlugin } from '@capacitor/core';
import type { VeloTerminalPlugin, TerminalStatus, SetupProgressEvent } from 'velo-terminal';

const VeloTerminal = registerPlugin<VeloTerminalPlugin>('VeloTerminal');

export type TerminalJobPoll = {
  output: string[];
  done: boolean;
  code: number | null;
};

/** True when running inside the Android APK (native Capacitor runtime). */
export const isNativeTerminal = (): boolean => Capacitor.isNativePlatform();

/** Current Alpine/proot install status; null on web. */
export async function getTerminalStatus(): Promise<TerminalStatus | null> {
  if (!isNativeTerminal()) return null;
  return VeloTerminal.status();
}

/**
 * Downloads + extracts the Alpine minirootfs (one-time, permanent).
 * Streams progress lines through onProgress. Resolves to the final status.
 */
export async function installAlpine(
  onProgress?: (message: string) => void,
): Promise<TerminalStatus | null> {
  if (!isNativeTerminal()) return null;

  const listener = await VeloTerminal.addListener('setupProgress', (event: SetupProgressEvent) => {
    if (!onProgress) return;
    const percent = event.percent >= 0 ? ` ${event.percent}%` : '';
    onProgress(`[alpine] ${event.message}${percent}`);
  });

  try {
    return await VeloTerminal.setupAlpine();
  } finally {
    await listener.remove();
  }
}

/**
 * Ensures the Alpine Linux environment is ready on Android.
 * Downloads the minirootfs on first use (Acode-style) and reports
 * progress lines through onProgress. Resolves to the final status.
 * On web this is a no-op.
 */
export async function ensureAlpineReady(
  onProgress?: (message: string) => void,
): Promise<TerminalStatus | null> {
  if (!isNativeTerminal()) return null;

  const status = await VeloTerminal.status();
  if (status.alpineInstalled || !status.prootAvailable) {
    return status;
  }

  const listener = await VeloTerminal.addListener('setupProgress', (event: SetupProgressEvent) => {
    if (!onProgress) return;
    const percent = event.percent >= 0 ? ` ${event.percent}%` : '';
    onProgress(`[alpine] ${event.message}${percent}`);
  });

  try {
    onProgress?.('[alpine] First run: installing Alpine Linux environment...');
    return await VeloTerminal.setupAlpine();
  } finally {
    await listener.remove();
  }
}

export async function startTerminalJob(command: string, cwd?: string): Promise<string> {
  if (isNativeTerminal()) {
    const { jobId } = await VeloTerminal.startJob({ command, cwd });
    return jobId;
  }
  const res = await fetch('/api/terminal/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, cwd }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to start command');
  }
  return data.jobId as string;
}

/**
 * Runs a command to completion, streaming new output lines through onLine.
 * Returns the exit code (null when unknown/timed out).
 */
export async function runTerminalCommand(
  command: string,
  onLine?: (line: string) => void,
  timeoutMs = 300_000,
): Promise<{ output: string[]; code: number | null }> {
  const jobId = await startTerminalJob(command);
  const startedAt = Date.now();
  const output: string[] = [];
  let emitted = 0;
  for (;;) {
    const state = await pollTerminalJob(jobId);
    if (!state) break;
    for (; emitted < state.output.length; emitted++) {
      output.push(state.output[emitted]);
      onLine?.(state.output[emitted]);
    }
    if (state.done) {
      removeTerminalJob(jobId).catch(() => undefined);
      return { output, code: state.code };
    }
    if (Date.now() - startedAt > timeoutMs) {
      stopTerminalJob(jobId).catch(() => undefined);
      removeTerminalJob(jobId).catch(() => undefined);
      const line = `Error: command timed out after ${Math.round(timeoutMs / 1000)}s.`;
      output.push(line);
      onLine?.(line);
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  return { output, code: null };
}

export async function pollTerminalJob(id: string): Promise<TerminalJobPoll | null> {
  if (isNativeTerminal()) {
    try {
      const state = await VeloTerminal.pollJob({ id });
      return { output: state.output, done: state.done, code: state.code };
    } catch {
      return null;
    }
  }
  const res = await fetch(`/api/terminal/jobs/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return {
    output: Array.isArray(data.output) ? data.output : [],
    done: Boolean(data.done),
    code: typeof data.code === 'number' ? data.code : null,
  };
}

export async function stopTerminalJob(id: string): Promise<void> {
  if (isNativeTerminal()) {
    await VeloTerminal.stopJob({ id });
    return;
  }
  await fetch(`/api/terminal/jobs/${id}/stop`, { method: 'POST' });
}

export async function removeTerminalJob(id: string): Promise<void> {
  if (isNativeTerminal()) {
    await VeloTerminal.removeJob({ id });
    return;
  }
  await fetch(`/api/terminal/jobs/${id}`, { method: 'DELETE' });
}
