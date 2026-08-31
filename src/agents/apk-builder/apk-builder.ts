import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { ProjectStateManager } from '../../orchestrator/project-state.js';
import type { IdeaValidationResult } from '../idea-validator/types.js';
import type { ApkBuildReport, ApkBuildStatus } from './types.js';

const execAsync = promisify(exec);

export class ApkBuilderAgent {
  constructor() {}

  /**
   * Redacts sensitive API keys, Expo tokens, and secrets from output logs.
   */
  private redactSecrets(text: string): string {
    if (!text) return '';
    let sanitized = text;

    if (process.env.EXPO_TOKEN) {
      sanitized = sanitized.replaceAll(process.env.EXPO_TOKEN, '[REDACTED_EXPO_TOKEN]');
    }
    if (process.env.GEMINI_API_KEY) {
      sanitized = sanitized.replaceAll(process.env.GEMINI_API_KEY, '[REDACTED_GEMINI_KEY]');
    }
    if (process.env.STITCH_API_KEY) {
      sanitized = sanitized.replaceAll(process.env.STITCH_API_KEY, '[REDACTED_STITCH_KEY]');
    }

    sanitized = sanitized.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]');
    return sanitized;
  }

  /**
   * Ensures eas.json configuration exists in the mobile project root with a preview APK profile.
   */
  private async ensureEasConfig(mobileDir: string, appSlug: string): Promise<void> {
    const easJsonPath = path.join(mobileDir, 'eas.json');
    try {
      await fs.stat(easJsonPath);
    } catch {
      const defaultEasConfig = {
        cli: {
          version: '>= 12.0.0',
          appVersionSource: 'remote',
        },
        build: {
          development: {
            developmentClient: true,
            distribution: 'internal',
          },
          preview: {
            distribution: 'internal',
            android: {
              buildType: 'apk',
            },
          },
          production: {},
        },
      };
      await fs.writeFile(easJsonPath, JSON.stringify(defaultEasConfig, null, 2), 'utf-8');
      console.log(`[ApkBuilderAgent] Created default eas.json with preview APK configuration.`);
    }

    // Ensure app.json has android.package
    const appJsonPath = path.join(mobileDir, 'app.json');
    try {
      const appJsonContent = await fs.readFile(appJsonPath, 'utf-8');
      const parsed = JSON.parse(appJsonContent);
      let modified = false;
      if (!parsed.expo) parsed.expo = {};
      if (!parsed.expo.android) parsed.expo.android = {};
      if (!parsed.expo.android.package) {
        const sanitizedSlug = appSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
        parsed.expo.android.package = `com.appfactory.${sanitizedSlug || 'mobileapp'}`;
        modified = true;
      }
      if (modified) {
        await fs.writeFile(appJsonPath, JSON.stringify(parsed, null, 2), 'utf-8');
        console.log(`[ApkBuilderAgent] Updated app.json with android package: ${parsed.expo.android.package}`);
      }
    } catch (err: any) {
      console.warn(`[ApkBuilderAgent] Could not verify/update app.json android package: ${err.message}`);
    }
  }

  /**
   * Ensures the mobile project folder is a valid git repository required by EAS CLI.
   */
  private async ensureGitRepo(mobileDir: string): Promise<void> {
    const gitDir = path.join(mobileDir, '.git');
    const gitIgnorePath = path.join(mobileDir, '.gitignore');
    try {
      await fs.writeFile(gitIgnorePath, `node_modules/\n.expo/\n.eas/\ndist/\n`, 'utf-8');
    } catch {}

    try {
      await fs.stat(gitDir);
      console.log(`[ApkBuilderAgent] Mobile directory is already a git repository.`);
    } catch {
      try {
        console.log(`[ApkBuilderAgent] Initializing git repository in "${mobileDir}" for EAS CLI compatibility...`);
        await execAsync('git init', { cwd: mobileDir });
        await execAsync('git config user.name "AppFactoryAgent"', { cwd: mobileDir });
        await execAsync('git config user.email "agent@appfactory.local"', { cwd: mobileDir });
        await execAsync('git add -A', { cwd: mobileDir });
        await execAsync('git commit -m "Initial commit for EAS build"', { cwd: mobileDir });
        console.log(`[ApkBuilderAgent] Git repository initialized and initial commit created.`);
      } catch (gitErr: any) {
        console.warn(`[ApkBuilderAgent] Warning during git repo initialization: ${gitErr.message}`);
      }
    }
  }

  /**
   * Links or creates the project on EAS Cloud non-interactively via eas init.
   */
  private async ensureEasProject(mobileDir: string, accountName?: string): Promise<void> {
    try {
      const accFlag = accountName ? `--account ${accountName}` : '';
      console.log(`[ApkBuilderAgent] Linking/initializing project on EAS Cloud via "eas init ${accFlag.trim()}"...`);
      const initCmd = `npx --yes eas init ${accFlag} --non-interactive`;
      const { stdout, stderr } = await execAsync(initCmd, { cwd: mobileDir, timeout: 60000 });
      console.log(`[ApkBuilderAgent] EAS project initialized: ${stdout || stderr}`);
    } catch (err: any) {
      console.warn(`[ApkBuilderAgent] Warning during eas init: ${err.message}`);
    }
  }

  /**
   * Main entry point for ApkBuilderAgent.
   */
  async buildApk(
    projectId: string,
    idea: string,
    projectFolderPath: string,
    stateManager: ProjectStateManager,
    validationResult?: IdeaValidationResult
  ): Promise<ApkBuildReport | null> {
    if (validationResult?.recommendation === 'REJECT') {
      console.log(`[ApkBuilderAgent] Skipping APK Build because Idea Validation recommendation is "REJECT".`);
      await stateManager.updateState({
        apkBuildSkipped: true,
        skipReason: 'Idea Validation rejected the product idea.',
      });
      return null;
    }

    console.log(`[ApkBuilderAgent] Starting APK Builder Agent for project "${projectId}"...`);
    await stateManager.updateStatus('IN_PROGRESS');
    await stateManager.updateStage('APK_BUILD');

    const startTime = Date.now();
    const mobileDir = path.join(projectFolderPath, 'mobile');
    const artifactsDir = path.join(projectFolderPath, 'artifacts');
    await fs.mkdir(artifactsDir, { recursive: true });

    // Verify mobile project directory exists
    try {
      await fs.stat(mobileDir);
    } catch {
      console.error(`[ApkBuilderAgent] Mobile project directory "${mobileDir}" does not exist.`);
      await stateManager.updateStage('APK_BUILD_FAILED');
      await stateManager.updateState({
        apkBuildComplete: false,
        apkBuildSuccess: false,
        apkBuildError: `Mobile project folder not found at ${mobileDir}`,
      });
      throw new Error(`Mobile project directory does not exist: ${mobileDir}`);
    }

    let appName = 'AppFactoryMobile';
    let appSlug = 'appfactory-mobile';
    try {
      const appJsonContent = await fs.readFile(path.join(mobileDir, 'app.json'), 'utf-8');
      const parsedAppJson = JSON.parse(appJsonContent);
      appName = parsedAppJson.expo?.name || appName;
      appSlug = parsedAppJson.expo?.slug || appSlug;
    } catch {}

    await this.ensureEasConfig(mobileDir, appSlug);
    await this.ensureGitRepo(mobileDir);

    const errors: string[] = [];
    const warnings: string[] = [];
    let buildId = `build_${Date.now()}`;
    let buildStatus: ApkBuildStatus = 'FAILED';
    let apkArtifactPath: string | undefined;
    let apkArtifactUrl: string | undefined;
    let userActionRequired: string | undefined;

    // Check authentication non-interactively
    let isAuthenticated = false;
    let accountName: string | undefined;
    if (process.env.EXPO_TOKEN && process.env.EXPO_TOKEN.trim().length > 0) {
      isAuthenticated = true;
      console.log(`[ApkBuilderAgent] EXPO_TOKEN detected in environment.`);
    } else {
      try {
        console.log(`[ApkBuilderAgent] Checking EAS CLI authentication status...`);
        const { stdout, stderr } = await execAsync('npx --yes eas whoami --non-interactive', {
          cwd: mobileDir,
          timeout: 30000,
          env: { ...process.env, CI: '1' },
        });
        const combined = (stdout + '\n' + stderr).trim();
        const loggedInUser = combined.split('\n').map(l => l.trim()).find(l => l && !l.includes('★') && !l.includes('upgrade') && !l.includes('npm install') && !l.includes('Proceeding') && !l.includes('Not logged in'));
        if (loggedInUser) {
          isAuthenticated = true;
          accountName = loggedInUser;
          console.log(`[ApkBuilderAgent] EAS CLI Authenticated as: ${accountName}`);
        } else {
          console.warn(`[ApkBuilderAgent] EAS whoami output did not indicate active login: ${combined}`);
        }
      } catch (authCheckErr: any) {
        const combinedErr = ((authCheckErr.stdout || '') + '\n' + (authCheckErr.stderr || '') + '\n' + (authCheckErr.message || '')).trim();
        const loggedInUser = combinedErr.split('\n').map(l => l.trim()).find(l => l && !l.includes('★') && !l.includes('upgrade') && !l.includes('npm install') && !l.includes('Proceeding') && !l.includes('Not logged in') && !l.includes('Command failed') && !l.includes('Error'));
        if (loggedInUser && (loggedInUser.includes('@') || loggedInUser.match(/^[a-zA-Z0-9_-]+$/))) {
          isAuthenticated = true;
          accountName = loggedInUser;
          console.log(`[ApkBuilderAgent] EAS CLI Authenticated as: ${accountName}`);
        } else {
          console.warn(`[ApkBuilderAgent] EAS whoami check returned error: ${combinedErr}`);
        }
      }
    }

    if (!isAuthenticated) {
      const authMsg = `EAS Authentication Required: No active Expo login session or EXPO_TOKEN was detected.`;
      console.warn(`[ApkBuilderAgent] ${authMsg}`);
      errors.push(authMsg);
      userActionRequired = `Please run "npx eas login" in your terminal or export "EXPO_TOKEN=<your-token>" to allow automated cloud APK builds.`;
      buildStatus = 'AUTHENTICATION_REQUIRED';
    } else {
      // Initialize EAS project link/creation non-interactively
      await this.ensureEasProject(mobileDir, accountName);

      // Execute EAS Android APK build non-interactively with resilient status polling
      try {
        let activeBuildId: string | null = null;

        // Check if a build was recently triggered or is in progress
        try {
          const { stdout: listStdout } = await execAsync('npx eas build:list --platform android --limit 1 --json', {
            cwd: mobileDir,
            timeout: 30000,
            env: { ...process.env, CI: '1' },
          });
          const listJson = JSON.parse(this.redactSecrets(listStdout));
          const latestBuild = Array.isArray(listJson) ? listJson[0] : listJson;
          if (latestBuild && (latestBuild.status === 'IN_PROGRESS' || latestBuild.status === 'IN_QUEUE')) {
            activeBuildId = latestBuild.id;
            console.log(`[ApkBuilderAgent] Found active in-progress cloud build ID: ${activeBuildId} (Status: ${latestBuild.status})`);
          }
        } catch {
          // Ignore list query failure and proceed to trigger new build
        }

        if (!activeBuildId) {
          console.log(`[ApkBuilderAgent] Initiating non-interactive EAS Android APK build (profile: preview)...`);
          const buildCmd = `npx eas build --platform android --profile preview --non-interactive --no-wait --json`;
          const { stdout, stderr } = await execAsync(buildCmd, {
            cwd: mobileDir,
            timeout: 60000,
            env: { ...process.env, CI: '1' },
          });

          const redactedStdout = this.redactSecrets(stdout);
          const redactedStderr = this.redactSecrets(stderr);

          try {
            const buildJson = JSON.parse(redactedStdout);
            const buildObj = Array.isArray(buildJson) ? buildJson[0] : buildJson;
            if (buildObj && buildObj.id) {
              activeBuildId = buildObj.id;
            }
          } catch {
            const idMatch = (redactedStdout + redactedStderr).match(/builds\/([a-f0-9-]{36})/);
            if (idMatch) {
              activeBuildId = idMatch[1];
            }
          }
        }

        if (activeBuildId) {
          buildId = activeBuildId;
          console.log(`[ApkBuilderAgent] Polling status for cloud build: ${buildId}...`);

          const maxAttempts = 120; // 120 * 15s = 30 minutes max build wait
          let attempts = 0;
          let buildFinished = false;

          while (attempts < maxAttempts && !buildFinished) {
            attempts++;
            await new Promise((res) => setTimeout(res, 15000));

            try {
              const { stdout: viewStdout } = await execAsync(`npx eas build:view ${buildId} --json`, {
                cwd: mobileDir,
                timeout: 30000,
                env: { ...process.env, CI: '1' },
              });

              const viewJson = JSON.parse(this.redactSecrets(viewStdout));
              const buildDetails = Array.isArray(viewJson) ? viewJson[0] : viewJson;

              if (buildDetails) {
                const status = buildDetails.status;
                console.log(`[ApkBuilderAgent] Poll attempt ${attempts}/${maxAttempts}: Build ${buildId} status is "${status}"`);

                if (status === 'FINISHED' || status === 'SUCCESS') {
                  buildFinished = true;
                  buildStatus = 'SUCCESS';
                  apkArtifactUrl =
                    buildDetails.artifacts?.buildUrl ||
                    buildDetails.artifacts?.applicationArchiveUrl ||
                    buildDetails.artifacts?.url ||
                    buildDetails.url;
                } else if (status === 'ERRORED' || status === 'FAILED' || status === 'CANCELED') {
                  buildFinished = true;
                  buildStatus = 'FAILED';
                  errors.push(`EAS Cloud Build finished with status: ${status}`);
                }
              }
            } catch (pollErr: any) {
              console.warn(`[ApkBuilderAgent] Warning: build status poll failed (attempt ${attempts}): ${pollErr.message}`);
            }
          }

          if (!buildFinished && buildStatus !== 'SUCCESS') {
            errors.push(`EAS Build timed out after polling for 30 minutes.`);
            buildStatus = 'FAILED';
          }
        } else {
          errors.push(`Failed to obtain a valid build ID from EAS CLI output.`);
          buildStatus = 'FAILED';
        }

        if (apkArtifactUrl) {
          try {
            console.log(`[ApkBuilderAgent] Downloading build artifact from ${apkArtifactUrl}...`);
            const fetchRes = await fetch(apkArtifactUrl);
            if (fetchRes.ok) {
              const arrayBuffer = await fetchRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const targetApkName = `${appName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_preview.apk`;
              const targetApkPath = path.join(artifactsDir, targetApkName);
              await fs.writeFile(targetApkPath, buffer);
              apkArtifactPath = `projects/${projectId}/artifacts/${targetApkName}`;
              console.log(`[ApkBuilderAgent] Successfully downloaded APK artifact to: ${apkArtifactPath}`);
              buildStatus = 'SUCCESS';
            }
          } catch (dlErr: any) {
            warnings.push(`Could not download APK artifact locally: ${dlErr.message}`);
          }
        }
      } catch (buildErr: any) {
        const errMsg = this.redactSecrets(buildErr.stderr || buildErr.stdout || buildErr.message || String(buildErr));
        console.error(`[ApkBuilderAgent] EAS Build command failed:\n${errMsg}`);
        errors.push(`EAS Build Failure: ${errMsg}`);

        if (
          errMsg.includes('Not logged in') ||
          errMsg.includes('Authentication') ||
          errMsg.includes('login') ||
          errMsg.includes('EXPO_TOKEN')
        ) {
          buildStatus = 'AUTHENTICATION_REQUIRED';
          userActionRequired = `Please run "npx eas login" in your terminal or set "EXPO_TOKEN" environment variable.`;
        } else {
          buildStatus = 'FAILED';
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const isSuccess = buildStatus === 'SUCCESS' && (!!apkArtifactPath || !!apkArtifactUrl);

    const report: ApkBuildReport = {
      projectId,
      appName,
      mobileProjectPath: `projects/${projectId}/mobile`,
      buildId,
      platform: 'android',
      profile: 'preview',
      buildStatus,
      apkArtifactPath,
      apkArtifactUrl,
      buildDurationMs: durationMs,
      errors,
      warnings,
      requiresUserAction: userActionRequired,
      generatedAt: new Date().toISOString(),
    };

    // Save report to projects/<projectId>/apk-build-report.json
    const reportPath = path.join(projectFolderPath, 'apk-build-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`[ApkBuilderAgent] Saved APK build report to: ${reportPath}`);

    // Update project.json state
    if (isSuccess) {
      await stateManager.updateStage('APK_BUILD_COMPLETED');
      await stateManager.updateState({
        apkBuildComplete: true,
        apkBuildSuccess: true,
        apkBuildId: buildId,
        apkArtifactPath,
        apkArtifactUrl,
      });
      console.log(`[ApkBuilderAgent] APK Build stage completed successfully for project "${projectId}".`);
    } else {
      await stateManager.updateStage('APK_BUILD_FAILED');
      await stateManager.updateState({
        apkBuildComplete: false,
        apkBuildSuccess: false,
        apkBuildStatus: buildStatus,
        apkBuildErrors: errors,
        requiresUserAction: userActionRequired,
      });
      console.warn(`[ApkBuilderAgent] APK Build stage failed with status: ${buildStatus}.`);
    }

    return report;
  }
}
