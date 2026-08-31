import 'dotenv/config';
import path from 'node:path';
import { VisualQaAgent } from '../src/agents/visual-qa/index.js';
import { ProjectStateManager } from '../src/orchestrator/project-state.js';

async function runStage11Validation() {
  const projectId = 'proj_1787774768366_3066cefd';
  const projectFolder = path.resolve(process.cwd(), 'projects', projectId);
  const stateManager = new ProjectStateManager(projectFolder);
  await stateManager.loadState();

  console.log(`[Stage 11 Runner] Running Stage 11 Visual QA Agent for project "${projectId}"...`);

  const visualQa = new VisualQaAgent();
  const vReport = await visualQa.runVisualQa(
    projectId,
    'Build a student expense tracking app',
    projectFolder,
    stateManager
  );

  console.log('[Stage 11 Runner] Visual QA Report Summary:');
  console.log(`- App Name: ${vReport.appName}`);
  console.log(`- Comparison Method: ${vReport.comparisonMethod}`);
  console.log(`- Overall Similarity Score: ${vReport.overallSimilarityScore}%`);
  console.log(`- Overall Status: ${vReport.overallStatus}`);
  console.log(`- Screens Compared Count: ${vReport.screensComparedCount}`);
  console.log(`- Total Issues Count: ${JSON.stringify(vReport.totalIssuesCount)}`);
}

runStage11Validation().catch((err) => {
  console.error('[Stage 11 Runner Error]:', err);
  process.exit(1);
});
