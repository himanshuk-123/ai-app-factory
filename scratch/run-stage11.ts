import 'dotenv/config';
import path from 'node:path';
import { VisualQaAgent } from '../src/agents/visual-qa/index.js';
import { ProjectStateManager } from '../src/orchestrator/project-state.js';

async function runStage11() {
  const projectId = 'proj_1787774768366_3066cefd';
  const projectFolder = path.resolve(process.cwd(), 'projects', projectId);
  const stateManager = new ProjectStateManager(projectFolder);
  await stateManager.loadState();

  console.log(`[Stage 11 Runner] Running Stage 11 Visual QA Agent for project "${projectId}"...`);

  const visualQa = new VisualQaAgent();
  const report = await visualQa.runVisualQa(
    projectId,
    'Build a student expense tracking app',
    projectFolder,
    stateManager
  );

  console.log('[Stage 11 Runner] Report Summary:');
  console.log(`- App Name: ${report.appName}`);
  console.log(`- Comparison Method: ${report.comparisonMethod}`);
  console.log(`- Overall Similarity Score: ${report.overallSimilarityScore}%`);
  console.log(`- Overall Status: ${report.overallStatus}`);
  console.log(`- Screens Compared Count: ${report.screensCompared.length}`);
  console.log(`- Total Issues Count:`, JSON.stringify(report.totalIssuesCount));
}

runStage11().catch((err) => {
  console.error('[Stage 11 Runner Error]:', err);
  process.exit(1);
});
