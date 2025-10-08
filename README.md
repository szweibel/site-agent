# Claude Answer Engine

A generalized framework for building Claude-powered answer engines for any domain.

## What is this?

This framework extracts the proven patterns from a production library reference agent into reusable components. Build domain-specific AI agents with:

- 🚀 **Server-Sent Events (SSE) streaming** - Real-time responses
- 💬 **Conversation history** - Multi-turn conversations
- 🔧 **Tool calling** - Integrate with any API or data source
- 📚 **Knowledge bases** - Load domain-specific context
- 🎨 **Ready-to-use UI** - Chat interface with markdown and tool visualization
- 🔌 **Plugin system** - Customize for your domain

## Quick Start

```bash
npm install
cd examples/starter
npm run dev
```

## Architecture

```
┌─────────────────────────────────────────────┐
│           Your Domain Plugin                │
│  - System prompt builder                    │
│  - Domain-specific tools                    │
│  - Knowledge base                           │
│  - Guardrails & escalation rules            │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│        @claude-ae/core                      │
│  - AgentEngine (streaming, history)         │
│  - AgentServer (SSE endpoints)              │
│  - Tool registry (MCP integration)          │
│  - Knowledge loader                         │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│      Anthropic Claude Agent SDK             │
│  - Claude API integration                   │
│  - Tool calling protocol                    │
└─────────────────────────────────────────────┘
```

## Packages

- **[@claude-ae/core](./packages/core)** - Core agent engine and server
- **[@claude-ae/ui](./packages/ui)** - Reusable chat UI components
- **[@claude-ae/cli](./packages/cli)** - Command-line interface

## Examples

- **[library-reference](./examples/library-reference)** - Library reference agent (original implementation)
- **[docs-qa](./examples/docs-qa)** - Documentation Q&A assistant
- **[starter](./examples/starter)** - Minimal template to start from

## Usage

### Create a Domain Plugin

```typescript
import { createPlugin, tool } from '@claude-ae/core';

const myPlugin = createPlugin({
  name: 'my-domain',

  // Build your system prompt
  systemPrompt: (context) => `You are a helpful assistant for ${context.domain}...`,

  // Define domain-specific tools
  tools: [
    tool('SearchKB', 'Search knowledge base', schema, async (params) => {
      // Your tool implementation
      return { content: [{ type: 'text', text: 'Results...' }] };
    })
  ],

  // Load knowledge base
  knowledgeBase: './knowledge/domain-notes.md',

  // Optional: Add guardrails
  beforeQuery: async (prompt) => {
    // Validate or transform prompt
    return prompt;
  },

  afterResponse: async (response) => {
    // Post-process response
    return response;
  }
});

export default myPlugin;
```

### Start the Agent Server

```typescript
import { AgentEngine, AgentServer } from '@claude-ae/core';
import myPlugin from './plugin.js';

const agent = new AgentEngine(myPlugin);
const server = new AgentServer({
  agent,
  port: 3000,
  basePath: '/chat'
});

await server.start();
// Server running at http://localhost:3000/chat
```

### Use the CLI

```typescript
import { AgentEngine } from '@claude-ae/core';
import myPlugin from './plugin.js';

const agent = new AgentEngine(myPlugin);
const result = await agent.run('What are your hours?');
console.log(result.response);
```

## Features

### Conversation History
- Automatic multi-turn conversation tracking
- Configurable history limits
- Sanitization and validation

### Tool Integration
- MCP (Model Context Protocol) server integration
- Built-in tool registry
- Type-safe tool definitions with Zod schemas

### Knowledge Management
- Markdown knowledge base loading
- Automatic injection into system prompts
- Pending notes workflow for capturing learnings

### Streaming
- Server-Sent Events (SSE) for real-time responses
- Tool execution visualization
- Abort/cancellation support

### Logging
- Structured interaction logs
- Success/failure tracking
- Metadata support

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Clean build artifacts
npm run clean
```

## License

MIT
