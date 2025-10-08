import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { KnowledgeSource } from '../types/index.js';

/**
 * Load knowledge from a file path, string, or function
 */
export async function loadKnowledge(source: string | KnowledgeSource | undefined): Promise<string> {
  if (!source) {
    return '';
  }

  // Simple string path to file
  if (typeof source === 'string') {
    try {
      const resolvedPath = resolve(source);
      return readFileSync(resolvedPath, 'utf8');
    } catch (error) {
      console.warn(`Failed to load knowledge from ${source}:`, error);
      return '';
    }
  }

  // Knowledge source object
  if (typeof source === 'object' && source.type && source.source) {
    switch (source.type) {
      case 'file': {
        if (typeof source.source !== 'string') {
          return '';
        }
        try {
          const resolvedPath = resolve(source.source);
          return readFileSync(resolvedPath, 'utf8');
        } catch (error) {
          console.warn(`Failed to load knowledge file ${source.source}:`, error);
          return '';
        }
      }

      case 'string': {
        return typeof source.source === 'string' ? source.source : '';
      }

      case 'function': {
        if (typeof source.source === 'function') {
          try {
            const result = await Promise.resolve(source.source());
            return typeof result === 'string' ? result : '';
          } catch (error) {
            console.warn('Failed to load knowledge from function:', error);
            return '';
          }
        }
        return '';
      }

      default:
        return '';
    }
  }

  return '';
}

/**
 * Format knowledge for inclusion in system prompt
 */
export function formatKnowledgeForPrompt(knowledge: string, label = 'Knowledge Base'): string {
  if (!knowledge || knowledge.trim().length === 0) {
    return '';
  }

  return `\n\n${label}:\n${knowledge.trim()}\n`;
}
