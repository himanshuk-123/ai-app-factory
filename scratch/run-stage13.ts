import 'dotenv/config';
import path from 'node:path';
import { WebQaDeployerAgent } from '../src/agents/web-qa-deployer/index.js';
import { ProjectStateManager } from '../src/orchestrator/project-state.js';

async function runStage13() {
  const projectId = 'proj_1787774768366_3066cefd';
  const projectFolder = path.resolve(process.cwd(), 'projects', projectId);
  const stateManager = new ProjectStateManager(projectFolder);
  await stateManager.loadState();

  console.log(`[Stage 13 Runner] Executing Web QA + GitHub Repo + Render Deployment Agent for project "${projectId}"...`);

  const agent = new WebQaDeployerAgent();
  const { webQaReport, githubReport, renderReport } = await agent.executeStage13(
    projectId,
    'Build a student expense tracking app',
    projectFolder,
    stateManager
  );

  console.log('\n==================================================');
  console.log('[Stage 13 Runner] Web QA Report Summary:');
  console.log('==================================================');
  console.log(`- Project ID: ${webQaReport.projectId}`);
  console.log(`- App Name: ${webQaReport.appName}`);
  console.log(`- Web Project Path: ${webQaReport.webProjectPath}`);
  console.log(`- Production Build Result: ${webQaReport.buildResult}`);
  console.log(`- Overall Web QA Status: ${webQaReport.overallQaStatus}`);

  console.log('\n==================================================');
  console.log('[Stage 13 Runner] GitHub Repository Report Summary:');
  console.log('==================================================');
  console.log(`- Push Status: ${githubReport.pushStatus}`);
  console.log(`- Authentication Status: ${githubReport.authenticationStatus}`);
  console.log(`- Repository Name: ${githubReport.repoName || 'N/A'}`);
  console.log(`- Repository URL: ${githubReport.repoUrl || 'N/A'}`);
  console.log(`- Commit SHA: ${githubReport.commitSha || 'N/A'}`);
  console.log(`- Files Pushed Count: ${githubReport.filesPushedCount}`);
  if (githubReport.setupRequiredMessage) {
    console.log(`- Setup Required Message:\n  ${githubReport.setupRequiredMessage}`);
  }

  console.log('\n==================================================');
  console.log('[Stage 13 Runner] Render Deployment Report Summary:');
  console.log('==================================================');
  console.log(`- Deployment Status: ${renderReport.deploymentStatus}`);
  console.log(`- Service ID: ${renderReport.serviceId || 'N/A'}`);
  console.log(`- Live URL: ${renderReport.liveUrl || 'N/A'}`);
  console.log(`- Health Check Result: ${renderReport.healthCheckResult}`);
  if (renderReport.setupRequiredMessage) {
    console.log(`- Setup Required Message:\n  ${renderReport.setupRequiredMessage}`);
  }
}

runStage13().catch((err) => {
  console.error('[Stage 13 Runner Error]:', err);
  process.exit(1);
});
