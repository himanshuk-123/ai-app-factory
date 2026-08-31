import 'dotenv/config';
import path from 'node:path';
import { AndroidQaAgent } from '../src/agents/android-qa/index.js';
import { ProjectStateManager } from '../src/orchestrator/project-state.js';

async function runStage10Validation() {
  const projectId = 'proj_1787774768366_3066cefd';
  const projectFolder = path.resolve(process.cwd(), 'projects', projectId);
  const stateManager = new ProjectStateManager(projectFolder);
  await stateManager.loadState();

  console.log(`[Stage 10 Runner] Running Stage 10 Android QA Agent for project "${projectId}"...`);

  const androidQa = new AndroidQaAgent();
  const qaReport = await androidQa.runQa(
    projectId,
    'Build a student expense tracking app',
    projectFolder,
    stateManager
  );

  console.log('[Stage 10 Runner] QA Report Summary:');
  console.log(`- Device ID: ${qaReport.deviceId}`);
  console.log(`- Device Model: ${qaReport.deviceModel}`);
  console.log(`- Installation Result: ${qaReport.installationResult}`);
  console.log(`- App Launch Result: ${qaReport.appLaunchResult}`);
  console.log(`- Screenshots Captured: ${qaReport.screenshots.length}`);
  console.log(`- Overall Status: ${qaReport.overallQaStatus}`);
}

runStage10Validation().catch((err) => {
  console.error('[Stage 10 Runner Error]:', err);
  process.exit(1);
});
