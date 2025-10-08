# Contributing to Claude Answer Engine

Thank you for your interest in contributing!

## Development Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd claude-answer-engine

# Install dependencies
npm install

# Build all packages
npm run build
```

## Project Structure

```
claude-answer-engine/
├── packages/
│   ├── core/          # Core framework (AgentEngine, AgentServer)
│   ├── ui/            # Reusable UI components (future)
│   └── cli/           # CLI tool (future)
├── examples/
│   ├── starter/       # Minimal example
│   ├── library-reference/  # Library reference agent
│   └── docs-qa/       # Documentation Q&A
└── README.md
```

## Adding a New Example

1. Create a new directory in `examples/`
2. Copy structure from `examples/starter/`
3. Create your plugin in `src/plugin.ts`
4. Add custom tools in `src/tools/`
5. Update knowledge base in `knowledge/notes.md`

## Testing

```bash
# Run tests for all packages
npm test

# Run tests for specific package
cd packages/core
npm test
```

## Code Style

- TypeScript with strict mode
- ES modules (not CommonJS)
- Explicit function return types
- Comprehensive JSDoc comments

## Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Questions?

Open an issue or discussion on GitHub.
