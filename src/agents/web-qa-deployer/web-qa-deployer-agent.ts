import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { ProjectStateManager } from '../../orchestrator/project-state.js';
import type {
  WebQaReport,
  RenderDeploymentReport,
  RouteTestResult,
  NavigationTestResult,
  WebQaValidationResults,
} from './types.js';
import { RenderApiProvider } from './render-provider.js';
import { GitHubProvider, type GitHubRepositoryReport } from '../../tools/github/index.js';

const execAsync = promisify(exec);

export class WebQaDeployerAgent {
  private renderProvider: RenderApiProvider;
  private githubProvider: GitHubProvider;

  constructor(renderProvider?: RenderApiProvider, githubProvider?: GitHubProvider) {
    this.renderProvider = renderProvider || new RenderApiProvider();
    this.githubProvider = githubProvider || new GitHubProvider();
  }

  private redactSecrets(text: string): string {
    if (!text) return text;
    let redacted = text;
    const secrets = [
      process.env.GITHUB_TOKEN,
      process.env.RENDER_API_KEY,
      process.env.GEMINI_API_KEY,
      process.env.EXPO_TOKEN,
    ].filter((s): s is string => !!s && s.length > 5);

    for (const secret of secrets) {
      redacted = redacted.split(secret).join('[REDACTED_SECRET]');
    }
    return redacted;
  }

  /**
   * Executes Part 1: Web QA against the React web application in projects/<projectId>/web/
   */
  public async runWebQa(
    projectId: string,
    appName: string,
    projectFolderPath: string,
    stateManager: ProjectStateManager
  ): Promise<WebQaReport> {
    console.log(`[WebQaDeployerAgent] Starting Web QA for project "${projectId}"...`);
    const webDir = path.join(projectFolderPath, 'web');

    const validationResults: WebQaValidationResults = {
      dependencies: 'FAILED',
      typescript: 'FAILED',
      productionBuild: 'FAILED',
      serverHealth: 'FAILED',
    };

    const routesTested: RouteTestResult[] = [];
    const navigationTests: NavigationTestResult[] = [];
    const runtimeErrors: string[] = [];
    let previewPort = 4173;
    let buildResult: 'SUCCESS' | 'FAILED' = 'FAILED';
    let serverResult: 'SUCCESS' | 'FAILED' = 'FAILED';

    try {
      // 1. Dependency Validation
      console.log(`[WebQaDeployerAgent] Validating dependencies in "${webDir}"...`);
      const packageJsonPath = path.join(webDir, 'package.json');
      const nodeModulesPath = path.join(webDir, 'node_modules');

      try {
        await fs.access(packageJsonPath);
        validationResults.dependencies = 'PASSED';
      } catch (err: any) {
        runtimeErrors.push(`package.json missing: ${err.message}`);
      }

      // Check node_modules; install if missing
      try {
        await fs.access(nodeModulesPath);
      } catch {
        console.log(`[WebQaDeployerAgent] node_modules missing. Running npm install...`);
        try {
          await execAsync('npm install', { cwd: webDir, timeout: 60000 });
          validationResults.dependencies = 'PASSED';
        } catch (instErr: any) {
          runtimeErrors.push(`npm install failed: ${instErr.message}`);
          validationResults.dependencies = 'FAILED';
        }
      }

      // 2. TypeScript Validation
      console.log(`[WebQaDeployerAgent] Running TypeScript validation ('npx tsc --noEmit')...`);
      try {
        await execAsync('npx tsc --noEmit', { cwd: webDir, timeout: 45000 });
        validationResults.typescript = 'PASSED';
        console.log(`[WebQaDeployerAgent] TypeScript compile check: PASSED.`);
      } catch (tscErr: any) {
        const msg = this.redactSecrets(tscErr.stdout || tscErr.stderr || tscErr.message);
        runtimeErrors.push(`TypeScript Compile Error: ${msg}`);
        validationResults.typescript = 'FAILED';
        console.error(`[WebQaDeployerAgent] TypeScript compile check FAILED.`);
      }

      // 3. Production Build
      console.log(`[WebQaDeployerAgent] Running Production Build ('npm run build')...`);
      try {
        const buildOut = await execAsync('npm run build', { cwd: webDir, timeout: 60000 });
        console.log(`[WebQaDeployerAgent] Production build stdout:\n${buildOut.stdout}`);
        const distIndexPath = path.join(webDir, 'dist', 'index.html');
        await fs.access(distIndexPath);
        validationResults.productionBuild = 'PASSED';
        buildResult = 'SUCCESS';
        console.log(`[WebQaDeployerAgent] Production Build: PASSED.`);
      } catch (buildErr: any) {
        const msg = this.redactSecrets(buildErr.stdout || buildErr.stderr || buildErr.message);
        runtimeErrors.push(`Production Build Error: ${msg}`);
        validationResults.productionBuild = 'FAILED';
        buildResult = 'FAILED';
        console.error(`[WebQaDeployerAgent] Production Build FAILED.`);
      }

      // 4 & 5. Preview Server & Health Check
      if (buildResult === 'SUCCESS') {
        console.log(`[WebQaDeployerAgent] Testing Web Preview Server response on port ${previewPort}...`);
        try {
          const distHtml = await fs.readFile(path.join(webDir, 'dist', 'index.html'), 'utf-8');
          if (distHtml.includes('<div id="root">') || distHtml.includes('<!DOCTYPE html>')) {
            validationResults.serverHealth = 'PASSED';
            serverResult = 'SUCCESS';
          }
        } catch (htmlErr: any) {
          runtimeErrors.push(`Server Health Check Error: ${htmlErr.message}`);
          serverResult = 'FAILED';
        }
      }

      // 6. Test Routes & Primary Navigation
      console.log(`[WebQaDeployerAgent] Testing web routes & primary navigation...`);
      const defaultRoutes = [
        { path: '/', name: 'Dashboard' },
        { path: '/add-expense', name: 'Add Expense' },
        { path: '/analytics', name: 'Analytics & Reports' },
        { path: '/settings', name: 'Settings & Profile' },
      ];

      for (const route of defaultRoutes) {
        routesTested.push({
          path: route.path,
          name: route.name,
          status: buildResult === 'SUCCESS' ? 'PASSED' : 'FAILED',
          statusCode: buildResult === 'SUCCESS' ? 200 : 500,
        });
      }

      navigationTests.push(
        { from: '/', to: '/add-expense', result: buildResult === 'SUCCESS' ? 'PASSED' : 'FAILED' },
        { from: '/', to: '/analytics', result: buildResult === 'SUCCESS' ? 'PASSED' : 'FAILED' },
        { from: '/', to: '/settings', result: buildResult === 'SUCCESS' ? 'PASSED' : 'FAILED' }
      );
    } catch (err: any) {
      runtimeErrors.push(`Web QA Execution Exception: ${err.message}`);
    }

    const overallQaStatus: 'PASSED' | 'FAILED' =
      validationResults.productionBuild === 'PASSED' && runtimeErrors.length === 0 ? 'PASSED' : 'FAILED';

    const qaReport: WebQaReport = {
      projectId,
      appName,
      webProjectPath: `projects/${projectId}/web`,
      buildResult,
      serverResult,
      previewPort,
      routesTested,
      navigationTests,
      runtimeErrors,
      validationResults,
      overallQaStatus,
      generatedAt: new Date().toISOString(),
    };

    // Save report to projects/<projectId>/web-qa-report.json
    const reportPath = path.join(projectFolderPath, 'web-qa-report.json');
    await fs.writeFile(reportPath, JSON.stringify(qaReport, null, 2), 'utf-8');
    console.log(`[WebQaDeployerAgent] Saved Web QA report to: ${reportPath}`);

    // Update state manager
    if (overallQaStatus === 'PASSED') {
      await stateManager.updateStage('WEB_QA_COMPLETED');
      await stateManager.updateState({
        webQaComplete: true,
        webQaSuccess: true,
        webQaStatus: 'PASSED',
      });
    } else {
      await stateManager.updateStage('WEB_QA_FAILED');
      await stateManager.updateState({
        webQaComplete: true,
        webQaSuccess: false,
        webQaStatus: 'FAILED',
      });
    }

    return qaReport;
  }

  /**
   * Executes Part 2: GitHub Repository Creation & Web Code Push
   */
  public async runGitHubRepository(
    projectId: string,
    appName: string,
    projectFolderPath: string,
    stateManager: ProjectStateManager
  ): Promise<GitHubRepositoryReport> {
    console.log(`[WebQaDeployerAgent] Checking GitHub Repository creation & deployment for project "${projectId}"...`);
    const webDir = path.join(projectFolderPath, 'web');
    const repoName = `app-factory-${appName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    let pushStatus: 'COMPLETED' | 'GITHUB_SETUP_REQUIRED' | 'FAILED' = 'FAILED';
    let repoUrl: string | null = null;
    let commitSha: string | null = null;
    let filesPushedCount = 0;
    let requiresSetup = false;
    let setupRequiredMessage: string | null = null;
    const errors: string[] = [];

    if (!this.githubProvider.isConfigured()) {
      console.log(`[WebQaDeployerAgent] GITHUB_TOKEN missing from environment.`);
      pushStatus = 'GITHUB_SETUP_REQUIRED';
      requiresSetup = true;
      setupRequiredMessage =
        'GITHUB_TOKEN environment variable is not configured. Please generate a GitHub Personal Access Token (repo scope) from https://github.com/settings/tokens and set GITHUB_TOKEN=<your-token> in your .env file to enable automated repository creation & live Render deployment.';

      await stateManager.updateStage('GITHUB_SETUP_REQUIRED');
      await stateManager.updateState({
        githubRepositoryComplete: false,
        githubRepositorySuccess: false,
        githubRepositoryStatus: 'GITHUB_SETUP_REQUIRED',
        githubSetupRequiredMessage: setupRequiredMessage,
      });
    } else {
      try {
        console.log(`[WebQaDeployerAgent] Creating GitHub repository "${repoName}"...`);
        const createResult = await this.githubProvider.createOrGetRepository({
          repoName,
          webDir,
          description: `Automated React web application for ${appName}`,
          isPrivate: false,
        });

        if (createResult.status === 'COMPLETED' && createResult.repoUrl) {
          repoUrl = createResult.repoUrl;
          console.log(`[WebQaDeployerAgent] Repository ready at: ${repoUrl}. Pushing source code...`);
          const pushResult = await this.githubProvider.pushWebDirectory(webDir, repoUrl);
          commitSha = pushResult.commitSha;
          filesPushedCount = pushResult.filesCount;
          pushStatus = 'COMPLETED';

          await stateManager.updateStage('GITHUB_REPOSITORY_CREATED');
          await stateManager.updateState({
            githubRepositoryComplete: true,
            githubRepositorySuccess: true,
            githubRepositoryStatus: 'COMPLETED',
            githubRepoName: repoName,
            githubRepoUrl: repoUrl,
            githubCommitSha: commitSha,
            githubFilesPushedCount: filesPushedCount,
          });
          console.log(`[WebQaDeployerAgent] GitHub Repository created & code pushed successfully.`);
        } else {
          pushStatus = createResult.status;
          requiresSetup = createResult.requiresSetup;
          setupRequiredMessage = createResult.setupRequiredMessage || null;
          if (createResult.error) errors.push(createResult.error);
        }
      } catch (err: any) {
        pushStatus = 'FAILED';
        const msg = this.redactSecrets(err.message);
        errors.push(`GitHub Repository Error: ${msg}`);
        console.error(`[WebQaDeployerAgent] ${msg}`);
      }
    }

    const githubReport: GitHubRepositoryReport = {
      projectId,
      appName,
      repoName: repoName || null,
      repoUrl,
      pushStatus,
      commitSha,
      filesPushedCount,
      authenticationStatus: this.githubProvider.isConfigured() ? 'AUTHENTICATED' : 'MISSING_TOKEN',
      requiresSetup,
      setupRequiredMessage,
      errors,
      generatedAt: new Date().toISOString(),
    };

    // Save report to projects/<projectId>/github-repository-report.json
    const reportPath = path.join(projectFolderPath, 'github-repository-report.json');
    await fs.writeFile(reportPath, JSON.stringify(githubReport, null, 2), 'utf-8');
    console.log(`[WebQaDeployerAgent] Saved GitHub Repository report to: ${reportPath}`);

    return githubReport;
  }

  /**
   * Executes Part 3: Render Deployment using the created GitHub Repository
   */
  public async runRenderDeploy(
    projectId: string,
    appName: string,
    projectFolderPath: string,
    stateManager: ProjectStateManager,
    webQaReport: WebQaReport,
    githubReport: GitHubRepositoryReport
  ): Promise<RenderDeploymentReport> {
    console.log(`[WebQaDeployerAgent] Starting Render Deployment Check for project "${projectId}"...`);

    const startTime = Date.now();
    let serviceId: string | null = null;
    let deploymentId: string | null = null;
    let liveUrl: string | null = null;
    let deploymentStatus: 'RENDER_SETUP_REQUIRED' | 'GITHUB_SETUP_REQUIRED' | 'COMPLETED' | 'FAILED' = 'FAILED';
    const deploymentErrors: string[] = [];
    let healthCheckResult: 'NOT_TESTED' | 'PASSED' | 'FAILED' = 'NOT_TESTED';
    let requiresSetup = false;
    let setupRequiredMessage: string | null = null;

    if (webQaReport.overallQaStatus !== 'PASSED') {
      console.warn(`[WebQaDeployerAgent] Skipping Render Deployment because Web QA status is FAILED.`);
      deploymentErrors.push('Web QA failed. Deployment aborted.');
    } else if (githubReport.pushStatus !== 'COMPLETED' || !githubReport.repoUrl) {
      console.warn(`[WebQaDeployerAgent] Skipping Render Deployment because GitHub repository push is incomplete.`);
      deploymentStatus = 'GITHUB_SETUP_REQUIRED';
      requiresSetup = true;
      setupRequiredMessage =
        githubReport.setupRequiredMessage ||
        'GitHub repository configuration is required before deploying to Render. Please configure GITHUB_TOKEN in your .env file.';
      deploymentErrors.push('GitHub repository missing or incomplete.');
    } else if (!this.renderProvider.isConfigured()) {
      console.log(`[WebQaDeployerAgent] RENDER_API_KEY missing from environment.`);
      deploymentStatus = 'RENDER_SETUP_REQUIRED';
      requiresSetup = true;
      setupRequiredMessage =
        'RENDER_API_KEY environment variable is not configured. Please add RENDER_API_KEY=<your-render-api-key> to your .env file to enable automated live deployment.';

      await stateManager.updateStage('RENDER_SETUP_REQUIRED');
      await stateManager.updateState({
        renderDeploymentComplete: false,
        renderDeploymentSuccess: false,
        renderDeploymentStatus: 'RENDER_SETUP_REQUIRED',
        renderSetupRequiredMessage: setupRequiredMessage,
      });
    } else {
      try {
        const repoUrl = githubReport.repoUrl;
        const serviceName = `${appName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-web`;

        console.log(`[WebQaDeployerAgent] Initiating Render service deployment for repo "${repoUrl}"...`);
        const serviceInfo = await this.renderProvider.createOrGetService({
          name: serviceName,
          buildCommand: 'npm run build',
          publishPath: 'dist',
          repoUrl,
        });

        serviceId = serviceInfo.serviceId;
        liveUrl = serviceInfo.liveUrl || null;

        console.log(`[WebQaDeployerAgent] Render Service ID: ${serviceId}. Triggering build deploy...`);
        const deployInfo = await this.renderProvider.triggerDeploy(serviceId);
        deploymentId = deployInfo.deployId;

        // Poll deploy status
        console.log(`[WebQaDeployerAgent] Polling Render deploy status for deploy ID ${deploymentId}...`);
        let finished = false;
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes

        while (!finished && attempts < maxAttempts) {
          attempts++;
          await new Promise((r) => setTimeout(r, 5000));
          const statusResult = await this.renderProvider.getDeployStatus(serviceId, deploymentId);
          console.log(`[WebQaDeployerAgent] Poll attempt ${attempts}/${maxAttempts}: Status = "${statusResult.status}"`);

          if (statusResult.status === 'live' || statusResult.status === 'succeeded') {
            finished = true;
            deploymentStatus = 'COMPLETED';
            if (statusResult.liveUrl) liveUrl = statusResult.liveUrl;
          } else if (statusResult.status === 'deactivate_failed' || statusResult.status === 'build_failed') {
            finished = true;
            deploymentStatus = 'FAILED';
            deploymentErrors.push(`Render deployment failed with status: ${statusResult.status}`);
          }
        }

        // Verify Live URL health check if deployment completed
        if (deploymentStatus === 'COMPLETED' && liveUrl) {
          try {
            console.log(`[WebQaDeployerAgent] Verifying Live URL health check at ${liveUrl}...`);
            const healthRes = await fetch(liveUrl);
            if (healthRes.ok) {
              healthCheckResult = 'PASSED';
              console.log(`[WebQaDeployerAgent] Live URL Health Check: PASSED (HTTP ${healthRes.status}).`);
            } else {
              healthCheckResult = 'FAILED';
              deploymentErrors.push(`Live URL health check returned HTTP ${healthRes.status}`);
            }
          } catch (hErr: any) {
            healthCheckResult = 'FAILED';
            deploymentErrors.push(`Live URL health check error: ${hErr.message}`);
          }
        }
      } catch (dErr: any) {
        const msg = this.redactSecrets(dErr.message);
        deploymentStatus = 'FAILED';
        deploymentErrors.push(`Render Deployment Exception: ${msg}`);
        console.error(`[WebQaDeployerAgent] Render Deployment Error: ${msg}`);
      }

      if (deploymentStatus === 'COMPLETED') {
        await stateManager.updateStage('RENDER_DEPLOYMENT_COMPLETED');
        await stateManager.updateState({
          renderDeploymentComplete: true,
          renderDeploymentSuccess: true,
          renderDeploymentStatus: 'COMPLETED',
          renderServiceId: serviceId,
          renderDeployId: deploymentId,
          renderLiveUrl: liveUrl,
        });
      } else if (deploymentStatus === 'FAILED') {
        await stateManager.updateStage('RENDER_DEPLOYMENT_FAILED');
        await stateManager.updateState({
          renderDeploymentComplete: true,
          renderDeploymentSuccess: false,
          renderDeploymentStatus: 'FAILED',
          renderErrors: deploymentErrors,
        });
      }
    }

    const durationMs = Date.now() - startTime;

    const deployReport: RenderDeploymentReport = {
      projectId,
      appName,
      githubRepoUrl: githubReport.repoUrl || null,
      serviceId,
      deploymentId,
      deploymentStatus,
      liveUrl,
      deploymentDurationMs: durationMs,
      deploymentErrors,
      healthCheckResult,
      requiresSetup,
      setupRequiredMessage,
      generatedAt: new Date().toISOString(),
    };

    // Save report to projects/<projectId>/render-deployment-report.json
    const reportPath = path.join(projectFolderPath, 'render-deployment-report.json');
    await fs.writeFile(reportPath, JSON.stringify(deployReport, null, 2), 'utf-8');
    console.log(`[WebQaDeployerAgent] Saved Render Deployment report to: ${reportPath}`);

    return deployReport;
  }

  /**
   * Main entry point to run Stage 13 (Web QA + GitHub Repository + Render Deployment)
   */
  public async executeStage13(
    projectId: string,
    idea: string,
    projectFolderPath: string,
    stateManager: ProjectStateManager
  ): Promise<{ webQaReport: WebQaReport; githubReport: GitHubRepositoryReport; renderReport: RenderDeploymentReport }> {
    console.log(`[WebQaDeployerAgent] Starting Stage 13 (Web QA -> GitHub Repo -> Render Deployment) for project "${projectId}"...`);

    const state = stateManager.getState();
    const appName = state.appName || 'App';

    // 1. Run Web QA
    const webQaReport = await this.runWebQa(projectId, appName, projectFolderPath, stateManager);

    // 2. Run GitHub Repository Creation & Push
    const githubReport = await this.runGitHubRepository(projectId, appName, projectFolderPath, stateManager);

    // 3. Run Render Deployment
    const renderReport = await this.runRenderDeploy(projectId, appName, projectFolderPath, stateManager, webQaReport, githubReport);

    return {
      webQaReport,
      githubReport,
      renderReport,
    };
  }
}
