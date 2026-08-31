import 'dotenv/config';
import path from 'node:path';
import { AndroidQaAgent } from '../src/agents/android-qa/index.js';
import { ProjectStateManager } from '../src/orchestrator/project-state.js';

async function runStage10() {
  const projectId = 'proj_1787774768366_3066cefd';
  const projectFolder = path.resolve(process.cwd(), 'projects', projectId);
  const stateManager = new ProjectStateManager(projectFolder);
  await stateManager.loadState();

  console.log(`[Stage 10 Runner] Running Android QA Agent for project "${projectId}"...`);

  const androidQa = new AndroidQaAgent();
  const report = await androidQa.runQa(
    projectId,
    'Build a student expense tracking app',
    projectFolder,
    stateManager
  );

  console.log('[Stage 10 Runner] Result:', JSON.stringify(report, null, 2));
}

runStage10().catch((err) => {
  console.error('[Stage 10 Runner Error]:', err);
  process.exit(1);
});
