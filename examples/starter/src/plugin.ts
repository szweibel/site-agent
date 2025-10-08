import { createPlugin, tool } from '@claude-ae/core';
import { z } from 'zod';

/**
 * Example custom tool
 */
const searchTool = tool(
  'SearchExample',
  'Search for information in your domain',
  z.object({
    query: z.string().describe('Search query')
  }).shape,
  async ({ query }) => {
    // Implement your search logic here
    return {
      content: [
        {
          type: 'text',
          text: `Results for "${query}": Example result 1, Example result 2`
        }
      ]
    };
  }
);

/**
 * Domain plugin configuration
 */
export const plugin = createPlugin({
  name: 'starter-example',
  version: '0.1.0',

  // Define your system prompt
  systemPrompt: `You are a helpful assistant for [YOUR DOMAIN].

Your role:
- Answer questions accurately and concisely
- Use the SearchExample tool to find information
- Be friendly and professional

Guidelines:
- Stay within your domain expertise
- Cite sources when possible
- Escalate complex queries to a human

Today's date: ${new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`,

  // Available tools
  tools: [searchTool],

  // Allowed tools (includes WebFetch and WebSearch by default)
  allowedTools: ['SearchExample', 'WebFetch', 'WebSearch'],

  // Knowledge base file
  knowledgeBase: './knowledge/notes.md',

  // Logging configuration
  logging: {
    enabled: true,
    path: './logs/interactions.log'
  },

  // History configuration
  history: {
    maxTurns: 20,
    enabled: true
  },

  // Optional: Validate queries before sending to Claude
  beforeQuery: async (prompt) => {
    // Example: Block empty or very short queries
    if (prompt.length < 3) {
      throw new Error('Query too short');
    }
    return prompt;
  },

  // Optional: Post-process responses
  afterResponse: async (response) => {
    // Example: Add footer to all responses
    return response + '\n\n---\n*Powered by Claude Answer Engine*';
  },

  // Optional: Check if query should be escalated
  shouldEscalate: async (context, response) => {
    // Example: Escalate if response mentions uncertainty
    return response.toLowerCase().includes('i\'m not sure') ||
           response.toLowerCase().includes('i don\'t know');
  }
});

export default plugin;
