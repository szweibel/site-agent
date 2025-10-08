import { query, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import type { SDKAssistantMessage, SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type {
  DomainPlugin,
  RunOptions,
  StreamOptions,
  AgentResult,
  ConversationTurn,
  InteractionLogEntry
} from '../types/index.js';
import { sanitizeHistory, buildPromptWithHistory } from './history.js';
import { loadKnowledge, formatKnowledgeForPrompt } from '../knowledge/loader.js';
import { logInteraction } from './logger.js';

/**
 * Extract text content from an assistant message
 */
function extractTextFromAssistantMessage(message: SDKAssistantMessage): string {
  const blocks = message?.message?.content;
  if (!Array.isArray(blocks)) {
    return '';
  }

  return blocks
    .filter((block: any) => block?.type === 'text')
    .map((block: any) => block.text as string)
    .join('');
}

/**
 * Core agent engine that processes queries using Claude
 */
export class AgentEngine {
  private plugin: DomainPlugin;
  private systemPrompt: string | null = null;
  private knowledgeBase: string | null = null;

  constructor(plugin: DomainPlugin) {
    this.plugin = plugin;
  }

  /**
   * Initialize the agent (load knowledge, build system prompt)
   */
  private async initialize(): Promise<void> {
    if (this.systemPrompt) {
      return; // Already initialized
    }

    // Load knowledge base
    this.knowledgeBase = await loadKnowledge(this.plugin.knowledgeBase);

    // Build system prompt
    if (typeof this.plugin.systemPrompt === 'function') {
      this.systemPrompt = await Promise.resolve(this.plugin.systemPrompt());
    } else {
      this.systemPrompt = this.plugin.systemPrompt;
    }

    // Inject knowledge into system prompt
    if (this.knowledgeBase) {
      this.systemPrompt += formatKnowledgeForPrompt(this.knowledgeBase);
    }
  }

  /**
   * Stream responses from Claude
   */
  async stream(options: StreamOptions): Promise<AgentResult> {
    await this.initialize();

    const { prompt, history, onMessage, abortController, metadata } = options;

    // Sanitize history
    const maxTurns = this.plugin.history?.maxTurns ?? 20;
    const sanitizedHistory = sanitizeHistory(history, maxTurns);

    // Apply beforeQuery hook
    let effectivePrompt = prompt.trim();
    if (this.plugin.beforeQuery) {
      const transformed = await Promise.resolve(
        this.plugin.beforeQuery(effectivePrompt, {
          prompt: effectivePrompt,
          history: sanitizedHistory,
          metadata
        })
      );
      if (transformed === null) {
        throw new Error('Query rejected by beforeQuery hook');
      }
      effectivePrompt = transformed;
    }

    // Build prompt with history
    const fullPrompt = buildPromptWithHistory(sanitizedHistory, effectivePrompt);

    // Create MCP servers from tools
    const mcpServers: Record<string, any> = {};
    if (this.plugin.tools.length > 0) {
      const serverName = `${this.plugin.name}-tools`;
      mcpServers[serverName] = createSdkMcpServer({
        name: serverName,
        version: this.plugin.version ?? '1.0.0',
        tools: this.plugin.tools
      });
    }

    // Determine allowed tools
    const allowedTools = this.plugin.allowedTools ?? [
      ...this.plugin.tools.map((t) => t.name),
      'WebSearch',
      'WebFetch'
    ];

    // Query Claude
    const responseStream = query({
      prompt: fullPrompt,
      options: {
        systemPrompt: this.systemPrompt ?? '',
        permissionMode: 'bypassPermissions',
        allowedTools,
        mcpServers,
        ...(abortController ? { abortController } : {})
      }
    }) as AsyncIterable<SDKMessage>;

    // Process stream
    let assembledResponse = '';
    let hasStreamedContent = false;
    let agentExecutionFailed = false;
    let capturedError: unknown = null;
    let totalCostUsd: number | undefined;
    let usage: { inputTokens: number; outputTokens: number } | undefined;

    try {
      for await (const message of responseStream) {
        if (onMessage) {
          await onMessage(message);
        }

        if (message.type === 'stream_event') {
          const event = message.event;
          if (event?.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            const chunk = event.delta.text ?? '';
            if (chunk) {
              hasStreamedContent = true;
            }
          }
          continue;
        }

        if (message.type === 'assistant') {
          const text = extractTextFromAssistantMessage(message);
          if (text) {
            assembledResponse = text;
          }
          continue;
        }

        if (message.type === 'result') {
          if (message.is_error) {
            agentExecutionFailed = true;
          }
          totalCostUsd = message.total_cost_usd;
          usage = message.usage
            ? {
                inputTokens: message.usage.input_tokens ?? 0,
                outputTokens: message.usage.output_tokens ?? 0
              }
            : undefined;
        }
      }

      if (agentExecutionFailed) {
        throw new Error('Agent execution failed.');
      }
    } catch (error) {
      capturedError = error;
      throw error;
    } finally {
      // Log interaction
      if (this.plugin.logging?.enabled !== false) {
        const logEntry: InteractionLogEntry = {
          timestamp: new Date().toISOString(),
          userPrompt: effectivePrompt,
          assistantResponse: assembledResponse,
          success: !capturedError && !agentExecutionFailed,
          ...(metadata || this.plugin.metadata ? { metadata: { ...this.plugin.metadata, ...metadata } } : {}),
          ...(sanitizedHistory.length > 0 ? { history: sanitizedHistory } : {}),
          ...(capturedError
            ? { error: capturedError instanceof Error ? capturedError.message : String(capturedError) }
            : agentExecutionFailed
              ? { error: 'Agent execution failed.' }
              : {})
        };

        await logInteraction(logEntry, this.plugin.logging);
      }
    }

    // Apply afterResponse hook
    let finalResponse = assembledResponse;
    if (this.plugin.afterResponse) {
      const transformed = await Promise.resolve(
        this.plugin.afterResponse(assembledResponse, {
          prompt: effectivePrompt,
          history: sanitizedHistory,
          metadata
        })
      );
      if (transformed !== null) {
        finalResponse = transformed;
      }
    }

    // Check escalation
    if (this.plugin.shouldEscalate) {
      const shouldEscalate = await Promise.resolve(
        this.plugin.shouldEscalate(
          { prompt: effectivePrompt, history: sanitizedHistory, metadata },
          finalResponse
        )
      );
      if (shouldEscalate) {
        console.warn('Query escalation triggered');
      }
    }

    return {
      response: finalResponse,
      streamed: hasStreamedContent,
      cost: totalCostUsd,
      usage
    };
  }

  /**
   * Run a query and get the final response
   */
  async run(options: RunOptions): Promise<AgentResult> {
    let emittedText = false;

    const streamOptions: StreamOptions = {
      prompt: options.prompt,
      history: options.history,
      metadata: options.metadata,
      onMessage: async (message) => {
        if (!options.onTextChunk) {
          return;
        }

        if (message.type === 'stream_event') {
          const event = message.event;
          if (event?.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            const chunk = event.delta.text ?? '';
            if (chunk) {
              emittedText = true;
              options.onTextChunk(chunk);
            }
          }
          return;
        }

        if (message.type === 'assistant') {
          const text = extractTextFromAssistantMessage(message);
          if (text && !emittedText) {
            emittedText = true;
            options.onTextChunk(text);
          }
        }
      }
    };

    const result = await this.stream(streamOptions);

    return {
      response: result.response,
      streamed: emittedText || result.streamed,
      cost: result.cost,
      usage: result.usage
    };
  }
}
