import { createInterface } from 'node:readline';
import { AgentEngine } from '@site-agent/core';
import { plugin } from './plugin.js';

async function readUserPrompt(): Promise<string> {
  const messageFromArgs = process.argv.slice(2).join(' ').trim();
  if (messageFromArgs) {
    return messageFromArgs;
  }

  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Your question: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function run(): Promise<void> {
  const userPrompt = await readUserPrompt();
  if (!userPrompt) {
    console.error('No question provided. Exiting.');
    process.exit(1);
    return;
  }

  const agent = new AgentEngine(plugin);

  try {
    const { response } = await agent.run({
      prompt: userPrompt,
      onTextChunk: (chunk) => {
        process.stdout.write(chunk);
      }
    });

    if (response && !response.endsWith('\n')) {
      process.stdout.write('\n');
    }
  } catch (error) {
    console.error('\nError:', error);
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('Unhandled error:', error);
  process.exitCode = 1;
});
