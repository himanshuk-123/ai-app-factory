import 'dotenv/config';
import path from 'node:path';
import { ApkBuilderAgent } from '../src/agents/apk-builder/index.js';
import { ProjectStateManager } from '../src/orchestrator/project-state.js';

async function runStage9() {
  const projectId = 'proj_1787774768366_3066cefd';
  const projectFolder = path.resolve(process.cwd(), 'projects', projectId);
  const stateManager = new ProjectStateManager(projectFolder);
  await stateManager.loadState();

  console.log(`[Stage 9 Runner] Resuming APK Builder for project "${projectId}"...`);

  const apkBuilder = new ApkBuilderAgent();
  const report = await apkBuilder.buildApk(
    projectId,
    'Build a student expense tracking app',
    projectFolder,
    stateManager,
    { appName: 'PaceStudent' } as any
  );

  console.log('[Stage 9 Runner] Result:', JSON.stringify(report, null, 2));
}

runStage9().catch(err => {
  console.error('[Stage 9 Runner Error]:', err);
  process.exit(1);
});
