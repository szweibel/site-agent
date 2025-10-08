/**
 * Claude Answer Engine - Core Framework
 *
 * A generalized framework for building Claude-powered answer engines
 */

// Main classes
export { AgentEngine } from './agent/engine.js';
export { AgentServer } from './server/server.js';

// Utilities
export { sanitizeHistory, buildPromptWithHistory } from './agent/history.js';
export { loadKnowledge, formatKnowledgeForPrompt } from './knowledge/loader.js';
export { logInteraction } from './agent/logger.js';

// Tool helpers
export { tool } from './tools/index.js';

// Types
export type {
  DomainPlugin,
  ConversationTurn,
  Tool,
  KnowledgeSource,
  LogConfig,
  HistoryConfig,
  PluginContext,
  PromptBuilder,
  GuardrailFn,
  RunOptions,
  StreamOptions,
  AgentResult,
  InteractionLogEntry,
  ServerConfig,
  SDKMessage
} from './types/index.js';

/**
 * Helper function to create a plugin with type safety
 */
export function createPlugin(plugin: import('./types/index.js').DomainPlugin): import('./types/index.js').DomainPlugin {
  return plugin;
}
