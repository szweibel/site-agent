import type { ConversationTurn } from '../types/index.js';

const DEFAULT_MAX_TURNS = 20;

/**
 * Sanitize and validate conversation history
 */
export function sanitizeHistory(
  history: ConversationTurn[] | undefined,
  maxTurns = DEFAULT_MAX_TURNS
): ConversationTurn[] {
  if (!Array.isArray(history) || history.length === 0) {
    return [];
  }

  const turns: ConversationTurn[] = [];
  for (const entry of history) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const role = entry.role;
    const content = typeof entry.content === 'string' ? entry.content.trim() : '';
    if ((role === 'user' || role === 'assistant') && content) {
      turns.push({ role, content });
    }
  }

  if (turns.length <= maxTurns) {
    return turns;
  }

  return turns.slice(turns.length - maxTurns);
}

/**
 * Build a prompt with history context
 */
export function buildPromptWithHistory(
  history: ConversationTurn[] | undefined,
  nextPrompt: string
): string {
  const trimmedPrompt = nextPrompt.trim();
  const validHistory = sanitizeHistory(history);

  if (validHistory.length === 0) {
    return trimmedPrompt;
  }

  const transcript = validHistory
    .map((turn) => {
      const speaker = turn.role === 'assistant' ? 'Agent' : 'User';
      return `${speaker}: ${turn.content}`;
    })
    .join('\n\n');

  return `${transcript}\n\nUser: ${trimmedPrompt}`;
}
