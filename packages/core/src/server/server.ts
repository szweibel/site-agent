import express from 'express';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { AgentEngine } from '../agent/engine.js';
import type { ServerConfig, ConversationTurn } from '../types/index.js';

/**
 * Normalize base path
 */
function normalizeBasePath(input: string | undefined): string {
  if (!input) {
    return '/';
  }
  let value = input.trim();
  if (value === '') {
    return '/';
  }
  if (!value.startsWith('/')) {
    value = `/${value}`;
  }
  if (value.length > 1 && value.endsWith('/')) {
    value = value.slice(0, -1);
  }
  return value;
}

/**
 * Parse and sanitize conversation history from request
 */
function parseHistory(input: unknown, maxTurns: number): ConversationTurn[] {
  if (!Array.isArray(input) || input.length === 0) {
    return [];
  }

  const turns: ConversationTurn[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const role = (entry as { role?: unknown }).role;
    const contentRaw = (entry as { content?: unknown }).content;
    const content = typeof contentRaw === 'string' ? contentRaw.trim() : '';

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
 * Express server for serving the agent via HTTP with SSE streaming
 */
export class AgentServer {
  private app: express.Express;
  private agent: AgentEngine;
  private config: ServerConfig;
  private basePath: string;
  private apiPrefix: string;
  private apiPrefixes: string[];

  constructor(agent: AgentEngine, config: ServerConfig = {}) {
    this.agent = agent;
    this.config = config;
    this.basePath = normalizeBasePath(config.basePath);
    this.apiPrefix = this.basePath === '/' ? '/api' : `${this.basePath}/api`;
    this.apiPrefixes = this.basePath === '/' ? [this.apiPrefix] : ['/api', this.apiPrefix];
    this.app = this.createApp();
  }

  private createApp(): express.Express {
    const app = express();

    app.use(express.json({ limit: this.config.requestLimit ?? '1mb' }));

    // Query endpoint
    this.registerPostRoute('/query', async (req, res) => {
      const { prompt, history: rawHistory } = req.body ?? {};
      const promptText = typeof prompt === 'string' ? prompt.trim() : '';
      const maxHistory = this.config.maxHistory ?? 20;
      const history = parseHistory(rawHistory, maxHistory);

      if (!promptText) {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
      }

      const sendEvent = (event: string, data: unknown) => {
        if (res.writableEnded) {
          return;
        }
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const seenToolStarts = new Set<string>();
      const shouldEmitToolStart = (id: unknown): boolean => {
        if (typeof id !== 'string' || id.length === 0) {
          return true;
        }
        if (seenToolStarts.has(id)) {
          return false;
        }
        seenToolStarts.add(id);
        return true;
      };

      console.log('Received streaming request for prompt:', promptText);
      sendEvent('start', {});

      let clientClosed = false;
      let streamFinished = false;
      const abortController = new AbortController();

      const handleDisconnect = () => {
        if (streamFinished || clientClosed) {
          return;
        }
        clientClosed = true;
        abortController.abort();
      };

      req.on('aborted', handleDisconnect);
      res.on('close', handleDisconnect);

      try {
        const { response, cost, usage } = await this.agent.stream({
          prompt: promptText,
          history,
          metadata: { source: 'web', ...this.config.metadata },
          abortController,
          onMessage: async (message: SDKMessage) => {
            if (clientClosed) {
              return;
            }

            if (message.type === 'stream_event') {
              const event = message.event;
              if (event?.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                const text = event.delta.text ?? '';
                if (text) {
                  sendEvent('assistant-text', { text, mode: 'delta' });
                }
              } else if (event?.type === 'content_block_start' && event.block?.type === 'tool_use') {
                const block = event.block;
                if (shouldEmitToolStart(block.id)) {
                  sendEvent('tool-use', {
                    id: block.id ?? null,
                    name: block.name,
                    input: block.input ?? null,
                    stage: 'start'
                  });
                }
              } else if (event?.type === 'content_block_stop' && event.block?.type === 'tool_use') {
                const block = event.block;
                sendEvent('tool-use', {
                  id: block.id ?? null,
                  stage: 'end'
                });
              } else if (event) {
                sendEvent('stream-event', event);
              }
              return;
            }

            if (message.type === 'assistant') {
              const blocks = message.message?.content ?? [];
              for (const block of blocks) {
                if (block?.type === 'text') {
                  const text = block.text ?? '';
                  if (text) {
                    sendEvent('assistant-text', { text, mode: 'block' });
                  }
                  continue;
                }

                if (block?.type === 'tool_use') {
                  if (shouldEmitToolStart(block.id)) {
                    sendEvent('tool-use', {
                      id: block.id ?? null,
                      name: block.name,
                      input: block.input ?? null,
                      stage: 'start'
                    });
                  }
                }
              }
              return;
            }

            if (message.type === 'user') {
              const blocks = message.message?.content ?? [];
              for (const block of blocks) {
                if (block?.type === 'tool_result') {
                  sendEvent('tool-result', {
                    id: block.tool_use_id ?? null,
                    output: block.content ?? null
                  });
                }
              }
              return;
            }

            if (message.type === 'result') {
              const resultPayload: Record<string, unknown> = {
                isError: message.is_error
              };

              if (typeof cost === 'number') {
                resultPayload.totalCostUsd = cost;
              }
              if (usage) {
                resultPayload.usage = usage;
              }

              if (message.subtype === 'success') {
                resultPayload.result = message.result;
              }

              sendEvent('result', resultPayload);
              return;
            }

            sendEvent(message.type, message);
          }
        });

        if (!clientClosed) {
          streamFinished = true;
          sendEvent('done', { response });
          res.end();
        }
      } catch (error) {
        console.error('Agent request failed:', error);
        if (!res.writableEnded && !clientClosed) {
          streamFinished = true;
          sendEvent('error', { error: 'Agent request failed' });
          res.end();
        }
      }
    });

    // Health check
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok' });
    });

    return app;
  }

  private registerPostRoute(suffix: string, handler: express.RequestHandler): void {
    for (const prefix of this.apiPrefixes) {
      this.app.post(`${prefix}${suffix}`, handler);
    }
  }

  /**
   * Get the Express app instance
   */
  getApp(): express.Express {
    return this.app;
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    const port = this.config.port ?? 3000;
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        const basePathSuffix = this.basePath === '/' ? '/' : `${this.basePath}/`;
        console.log(`Agent server running at http://localhost:${port}${basePathSuffix}`);
        resolve();
      });
    });
  }
}
