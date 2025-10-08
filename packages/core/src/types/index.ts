import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';

/**
 * A single turn in a conversation
 */
export type ConversationTurn = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Tool definition using the Claude Agent SDK tool format
 * This matches the return type from the SDK's tool() function
 */
export type Tool = any;

/**
 * Knowledge base source
 */
export type KnowledgeSource = {
  type: 'file' | 'string' | 'function';
  source: string | (() => string) | (() => Promise<string>);
};

/**
 * Logging configuration
 */
export type LogConfig = {
  path?: string;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
};

/**
 * History configuration
 */
export type HistoryConfig = {
  maxTurns?: number;
  enabled?: boolean;
};

/**
 * Context passed to plugin hooks
 */
export type PluginContext = {
  prompt: string;
  history?: ConversationTurn[] | undefined;
  metadata?: Record<string, unknown> | undefined;
};

/**
 * Prompt builder function
 */
export type PromptBuilder = (context?: PluginContext) => string | Promise<string>;

/**
 * Guardrail function - can modify or reject inputs/outputs
 */
export type GuardrailFn = (
  value: string,
  context: PluginContext
) => string | Promise<string> | null | Promise<null>;

/**
 * Domain plugin definition
 */
export interface DomainPlugin {
  /** Plugin name */
  name: string;

  /** Plugin version */
  version?: string;

  /** System prompt or builder function */
  systemPrompt: string | PromptBuilder;

  /** Tools available to the agent */
  tools: Tool[];

  /** Allowed tool names (defaults to all tools) */
  allowedTools?: string[];

  /** Knowledge base source */
  knowledgeBase?: string | KnowledgeSource;

  /** Logging configuration */
  logging?: LogConfig;

  /** History configuration */
  history?: HistoryConfig;

  /** Pre-query hook - validate/transform user input */
  beforeQuery?: GuardrailFn;

  /** Post-response hook - validate/transform agent response */
  afterResponse?: GuardrailFn;

  /** Escalation check - return true if query should be escalated */
  shouldEscalate?: (context: PluginContext, response: string) => boolean | Promise<boolean>;

  /** Custom metadata to attach to all interactions */
  metadata?: Record<string, unknown>;
}

/**
 * Agent run options
 */
export type RunOptions = {
  /** User prompt */
  prompt: string;

  /** Conversation history */
  history?: ConversationTurn[];

  /** Callback for streaming text chunks */
  onTextChunk?: (chunk: string) => void;

  /** Custom metadata for this run */
  metadata?: Record<string, unknown>;
};

/**
 * Agent stream options
 */
export type StreamOptions = {
  /** User prompt */
  prompt: string;

  /** Conversation history */
  history?: ConversationTurn[] | undefined;

  /** Callback for each message */
  onMessage?: ((message: SDKMessage) => void | Promise<void>) | undefined;

  /** Abort controller for cancellation */
  abortController?: AbortController | undefined;

  /** Custom metadata for this run */
  metadata?: Record<string, unknown> | undefined;
};

/**
 * Agent result
 */
export type AgentResult = {
  /** Final response text */
  response: string;

  /** Whether content was streamed */
  streamed: boolean;

  /** Cost in USD */
  cost?: number | undefined;

  /** Token usage */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  } | undefined;
};

/**
 * Interaction log entry
 */
export type InteractionLogEntry = {
  timestamp: string;
  userPrompt: string;
  assistantResponse: string;
  metadata?: Record<string, unknown>;
  history?: ConversationTurn[];
  success: boolean;
  error?: string;
};

/**
 * Server configuration
 */
export type ServerConfig = {
  /** Port to listen on */
  port?: number;

  /** Base path for routes (e.g., '/chat') */
  basePath?: string;

  /** Maximum conversation history turns */
  maxHistory?: number;

  /** Request size limit */
  requestLimit?: string;

  /** Custom metadata */
  metadata?: Record<string, unknown>;
};

export type { SDKMessage };
