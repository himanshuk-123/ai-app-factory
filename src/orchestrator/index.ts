import 'dotenv/config';
import { Orchestrator } from './orchestrator.js';

async function main() {
  const args = process.argv.slice(2);
  const idea = args[0];

  if (!idea) {
    console.error('Error: Please provide an app idea.');
    console.error('Usage: npm run factory "<app idea>"');
    process.exit(1);
  }

  try {
    const orchestrator = new Orchestrator();
    await orchestrator.createProject(idea);
  } catch (error) {
    console.error('[Orchestrator Error]:', error);
    process.exit(1);
  }
}

main();
