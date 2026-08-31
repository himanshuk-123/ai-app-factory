import 'dotenv/config';
import path from 'node:path';
import { VisualAutoFixAgent } from '../src/agents/visual-auto-fix/index.js';
import { ProjectStateManager } from '../src/orchestrator/project-state.js';

async function runStage12() {
  const projectId = 'proj_1787774768366_3066cefd';
  const projectFolder = path.resolve(process.cwd(), 'projects', projectId);
  const stateManager = new ProjectStateManager(projectFolder);
  await stateManager.loadState();

  console.log(`[Stage 12 Runner] Running Stage 12 Visual Auto-Fix Agent for project "${projectId}"...`);

  const autoFixAgent = new VisualAutoFixAgent();
  const report = await autoFixAgent.autoFix(
    projectId,
    'Build a student expense tracking app',
    projectFolder,
    stateManager
  );

  console.log('[Stage 12 Runner] Report Summary:');
  console.log(`- App Name: ${report.appName}`);
  console.log(`- Total Issues Detected: ${report.totalIssuesDetected}`);
  console.log(`- Total Issues Fixed: ${report.totalIssuesFixed}`);
  console.log(`- Before Similarity Score: ${report.beforeSimilarityScore}%`);
  console.log(`- After Similarity Score: ${report.afterSimilarityScore}%`);
  console.log(`- Files Modified: ${report.filesModified.join(', ')}`);
  console.log(`- Rollback Events Count: ${report.rollbackEventsCount}`);
  console.log(`- Overall Status: ${report.overallStatus}`);
}

runStage12().catch((err) => {
  console.error('[Stage 12 Runner Error]:', err);
  process.exit(1);
});
