import { AgentEngine, AgentServer } from '@claude-ae/core';
import { plugin } from './plugin.js';

const agent = new AgentEngine(plugin);

const server = new AgentServer(agent, {
  port: Number(process.env.PORT) || 3000,
  basePath: process.env.BASE_PATH || '/',
  maxHistory: 20
});

await server.start();
