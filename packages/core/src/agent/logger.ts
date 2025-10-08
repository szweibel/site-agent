import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { InteractionLogEntry, LogConfig } from '../types/index.js';

const DEFAULT_LOG_PATH = './logs/interactions.log';

async function ensureDirectoryExists(filePath: string): Promise<void> {
  const dir = dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Log an interaction to a file
 */
export async function logInteraction(
  entry: InteractionLogEntry,
  config: LogConfig = {}
): Promise<void> {
  if (config.enabled === false) {
    return;
  }

  const logPath = resolve(config.path ?? DEFAULT_LOG_PATH);

  try {
    await ensureDirectoryExists(logPath);
    const line = JSON.stringify({
      ...entry,
      ...(config.metadata ? { metadata: { ...entry.metadata, ...config.metadata } } : {})
    });
    await fs.appendFile(logPath, `${line}\n`, { encoding: 'utf8' });
  } catch (error) {
    console.error('Failed to write interaction log:', error);
  }
}
