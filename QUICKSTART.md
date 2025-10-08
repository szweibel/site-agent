# Quick Start Guide

Get up and running with Site Agent in 5 minutes.

## Prerequisites

- **Node.js 20+** and npm (comes with Node)
- **Claude Code authentication**
  - Uses the same login as Claude Code
  - Part of your Claude.ai subscription
  - No separate API keys or billing required

## 1. Install Dependencies

```bash
# Install dependencies for all packages
npm install
```

## 2. Set Up Environment (Optional)

If needed, create a `.env` file for server configuration:

```bash
# Optional server settings
PORT=3000
BASE_PATH=/
```

No API keys needed - authentication uses your Claude Code login automatically.

## 3. Try the Starter Example

### CLI Mode

```bash
cd examples/starter
npm run dev "What are your hours?"
```

You'll see the agent respond in real-time, streaming text to your terminal.

### Server Mode

```bash
cd examples/starter
npm run dev:server
```

Then visit `http://localhost:3000` in your browser. (Note: You'll need to add a UI - see below)

## 4. Customize for Your Domain

### Edit the Plugin (`examples/starter/src/plugin.ts`)

```typescript
export const plugin = createPlugin({
  name: 'my-domain',

  // Your system prompt
  systemPrompt: `You are a helpful assistant for [YOUR DOMAIN]...`,

  // Your custom tools
  tools: [mySearchTool, myDataTool],

  // Your knowledge base
  knowledgeBase: './knowledge/notes.md'
});
```

### Add Custom Tools

Create a new file in `examples/starter/src/tools/`:

```typescript
import { tool } from '@site-agent/core';
import { z } from 'zod';

export const myTool = tool(
  'MyTool',
  'Description of what it does',
  z.object({
    param: z.string().describe('Parameter description')
  }).shape,
  async ({ param }) => {
    // Your implementation
    const result = await fetchData(param);

    return {
      content: [{ type: 'text', text: result }]
    };
  }
);
```

Then import it in your plugin:

```typescript
import { myTool } from './tools/myTool.js';

export const plugin = createPlugin({
  tools: [myTool],
  // ...
});
```

### Update Knowledge Base

Edit `examples/starter/knowledge/notes.md`:

```markdown
# My Domain Knowledge

## Important Information

- Hours: 9am-5pm
- Contact: support@example.com

## Common Questions

### Question 1
Answer 1

### Question 2
Answer 2
```

This content will be automatically loaded and injected into the system prompt.

## 5. Build and Deploy

### Build for Production

```bash
# Build all packages
npm run build

# Or build specific example
cd examples/starter
npm run build
```

### Run Production Build

```bash
cd examples/starter
npm run start:server
```

## Next Steps

### Add More Examples

Copy the starter example:

```bash
cp -r examples/starter examples/my-new-domain
cd examples/my-new-domain
# Customize plugin.ts
```

### Add a Frontend UI

The server exposes SSE endpoints at `/api/query`. You can:

1. Use the UI from `reference_agent/public/` as a template
2. Build your own with any framework (React, Vue, etc.)
3. Wait for `@site-agent/ui` package (coming soon)

### Add Advanced Features

- **Guardrails**: Use `beforeQuery` and `afterResponse` hooks
- **Escalation**: Implement `shouldEscalate` to detect complex queries
- **Custom logging**: Configure `logging.path` and `logging.metadata`
- **History limits**: Adjust `history.maxTurns`

## Troubleshooting

### "Module not found" errors

Make sure you've run `npm install` in the root directory. The monorepo uses npm workspaces.

### TypeScript errors

Build the core package first:

```bash
cd packages/core
npm run build
```

### Authentication errors

Make sure you're logged in to Claude Code. The framework uses the same authentication automatically - no API keys needed.

## Examples

See the `examples/` directory for:

- **starter** - Minimal template
- **library-reference** - Production library agent
- **docs-qa** - Documentation assistant (coming soon)

## Get Help

- Read the [full README](./README.md)
- Check [CONTRIBUTING.md](./CONTRIBUTING.md)
- Open an issue on GitHub
