# Starter Example

A minimal example showing how to build a domain-specific agent with Claude Answer Engine.

## Setup

```bash
npm install
```

## Run

### CLI Mode
```bash
npm run dev "What are your hours?"
```

### Server Mode
```bash
npm run dev:server
# Visit http://localhost:3000
```

## Customize

1. Edit `src/plugin.ts` to define your domain:
   - System prompt
   - Tools
   - Knowledge base

2. Add your tools in `src/tools/` directory

3. Update knowledge base in `knowledge/notes.md`

## Structure

```
src/
  plugin.ts       - Domain plugin definition
  index.ts        - CLI entrypoint
  server.ts       - Web server
  tools/          - Custom tools
knowledge/
  notes.md        - Knowledge base
```
