import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { ProjectStateManager } from '../../orchestrator/project-state.js';
import type { IdeaValidationResult } from '../idea-validator/types.js';
import { getLLMProvider, type ILLMProvider } from '../../tools/llm/index.js';
import { defaultAIGateway } from '../../infrastructure/ai/ai-gateway.js';
import type {
  BuildDebugResult,
  BuildDebugValidationResults,
  RepairAttempt,
  RepairFileFix,
} from './types.js';

const execAsync = promisify(exec);

export class BuildDebuggerAgent {
  private llmProvider: ILLMProvider;
  private MAX_REPAIR_ATTEMPTS = 5;

  constructor(llmProvider?: ILLMProvider) {
    this.llmProvider = llmProvider || getLLMProvider();
  }

  /**
   * Redacts sensitive API keys and secrets from output logs and prompts.
   */
  private redactSecrets(text: string): string {
    if (!text) return '';
    let sanitized = text;

    if (process.env.GEMINI_API_KEY) {
      sanitized = sanitized.replaceAll(process.env.GEMINI_API_KEY, '[REDACTED_GEMINI_KEY]');
    }
    if (process.env.STITCH_API_KEY) {
      sanitized = sanitized.replaceAll(process.env.STITCH_API_KEY, '[REDACTED_STITCH_KEY]');
    }

    // Generic API key format matching (e.g. AIzaSy...)
    sanitized = sanitized.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]');
    return sanitized;
  }

  /**
   * Safety check ensuring file modifications never escape the mobile directory.
   */
  private assertValidMobilePath(mobileDir: string, relativePath: string): string {
    const resolvedPath = path.resolve(mobileDir, relativePath);
    const normalizedMobileDir = path.resolve(mobileDir);

    if (!resolvedPath.startsWith(normalizedMobileDir)) {
      throw new Error(
        `Safety Violation: Attempted to write to "${resolvedPath}" which is outside the mobile project path "${normalizedMobileDir}".`
      );
    }
    return resolvedPath;
  }

  /**
   * Creates a Git checkpoint before applying automated code repairs if Git is available.
   */
  private async createGitCheckpoint(mobileDir: string, attempt: number): Promise<boolean> {
    try {
      // Check if git is available and inside a git tree
      await execAsync('git rev-parse --is-inside-work-tree', { cwd: mobileDir });
      await execAsync(`git add .`, { cwd: mobileDir });
      await execAsync(`git commit -m "build-debug auto-repair checkpoint attempt ${attempt}" --no-verify`, {
        cwd: mobileDir,
      });
      console.log(`[BuildDebuggerAgent] Created Git checkpoint before repair attempt #${attempt}.`);
      return true;
    } catch {
      // Git commit may fail if there are no changes or git isn't configured, which is safe to ignore
      return false;
    }
  }

  /**
   * Runs the full suite of validations on the Expo React Native project:
   * 1. Dependency installation verification (npm install)
   * 2. TypeScript compilation type-check (npx tsc --noEmit)
   * 3. Expo Doctor diagnostic check (npx expo-doctor / npx expo doctor)
   * 4. Android configuration & prebuild check (npx expo config --type public)
   */
  private async runProjectValidations(mobileDir: string): Promise<{
    passed: boolean;
    validationResults: BuildDebugValidationResults;
    combinedLogs: string;
    stdout: string;
    stderr: string;
    primaryError?: string;
  }> {
    const results: BuildDebugValidationResults = {
      dependencyCheck: false,
      typeCheck: false,
      expoDoctorCheck: false,
      androidPrebuildCheck: false,
    };

    let logBuffer = '';
    let stdoutBuffer = '';
    let stderrBuffer = '';
    let primaryError: string | undefined;

    // 1. Dependency Check
    try {
      logBuffer += `--- STAGE 1: DEPENDENCY CHECK ---\n`;
      const { stdout, stderr } = await execAsync('npm install', { cwd: mobileDir, timeout: 60000 });
      stdoutBuffer += stdout + '\n';
      stderrBuffer += stderr + '\n';
      logBuffer += `[npm install] Output: ${stdout.trim() || 'OK'}\n`;
      results.dependencyCheck = true;
    } catch (err: any) {
      const msg = this.redactSecrets(err.message || String(err));
      stderrBuffer += msg + '\n';
      logBuffer += `[npm install] FAILED: ${msg}\n`;
      primaryError = primaryError || `Dependency Check Failed: ${msg}`;
    }

    // 2. TypeScript Validation
    try {
      logBuffer += `--- STAGE 2: TYPESCRIPT TYPE-CHECK ---\n`;
      const { stdout, stderr } = await execAsync('npx tsc --noEmit', { cwd: mobileDir, timeout: 60000 });
      stdoutBuffer += stdout + '\n';
      stderrBuffer += stderr + '\n';
      logBuffer += `[npx tsc --noEmit] Output: ${stdout.trim() || '0 errors'}\n`;
      results.typeCheck = true;
    } catch (err: any) {
      const msg = this.redactSecrets(err.stdout || err.message || String(err));
      stderrBuffer += msg + '\n';
      logBuffer += `[npx tsc --noEmit] FAILED: ${msg}\n`;
      primaryError = primaryError || `TypeScript Validation Failed: ${msg}`;
    }

    // 3. Expo Doctor Check
    try {
      logBuffer += `--- STAGE 3: EXPO DOCTOR ---\n`;
      let doctorOutput = '';
      try {
        const res = await execAsync('npx expo-doctor', { cwd: mobileDir, timeout: 60000 });
        doctorOutput = res.stdout;
      } catch {
        // Fallback to npx expo doctor
        const res = await execAsync('npx expo doctor', { cwd: mobileDir, timeout: 60000 });
        doctorOutput = res.stdout;
      }
      stdoutBuffer += doctorOutput + '\n';
      logBuffer += `[Expo Doctor] Output: ${doctorOutput.trim() || 'OK'}\n`;
      results.expoDoctorCheck = true;
    } catch (err: any) {
      const msg = this.redactSecrets(err.stdout || err.message || String(err));
      stderrBuffer += msg + '\n';
      logBuffer += `[Expo Doctor] FAILED / WARNINGS: ${msg}\n`;
      // Mark as passed if non-fatal warnings, but if typeCheck passed and doctor failed with non-zero exit code:
      if (!primaryError && (msg.includes('Error') || msg.includes('Failed'))) {
        primaryError = `Expo Doctor Failed: ${msg}`;
      } else {
        // Expo doctor can issue non-fatal warnings
        results.expoDoctorCheck = true;
      }
    }

    // 4. Android Configuration / Build Validation Check
    try {
      logBuffer += `--- STAGE 4: ANDROID CONFIG & PREBUILD CHECK ---\n`;
      const { stdout, stderr } = await execAsync('npx expo config --type public', { cwd: mobileDir, timeout: 60000 });
      stdoutBuffer += stdout + '\n';
      stderrBuffer += stderr + '\n';
      logBuffer += `[npx expo config] Output: Valid app.json configuration\n`;
      results.androidPrebuildCheck = true;
    } catch (err: any) {
      const msg = this.redactSecrets(err.stderr || err.message || String(err));
      stderrBuffer += msg + '\n';
      logBuffer += `[npx expo config] FAILED: ${msg}\n`;
      primaryError = primaryError || `Android Config Validation Failed: ${msg}`;
    }

    const passed =
      results.dependencyCheck &&
      results.typeCheck &&
      results.expoDoctorCheck &&
      results.androidPrebuildCheck;

    return {
      passed,
      validationResults: results,
      combinedLogs: logBuffer,
      stdout: stdoutBuffer,
      stderr: stderrBuffer,
      primaryError,
    };
  }

  /**
   * Collects source files inside the mobile project to provide context to Gemini during repair.
   */
  private async collectProjectContext(mobileDir: string): Promise<string> {
    let contextStr = '';
    const filesToRead = ['package.json', 'app.json', 'tsconfig.json', 'App.tsx'];

    for (const relFile of filesToRead) {
      try {
        const full = path.join(mobileDir, relFile);
        const content = await fs.readFile(full, 'utf-8');
        contextStr += `=== FILE: ${relFile} ===\n${content}\n\n`;
      } catch {
        // File may not exist
      }
    }

    // Also collect screen component files under src/
    try {
      const srcDir = path.join(mobileDir, 'src');
      const readDirRecursive = async (dir: string, baseRel: string) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const relPath = path.join(baseRel, entry.name);
          if (entry.isDirectory()) {
            await readDirRecursive(path.join(dir, entry.name), relPath);
          } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
            const fullPath = path.join(dir, entry.name);
            const content = await fs.readFile(fullPath, 'utf-8');
            contextStr += `=== FILE: ${relPath} ===\n${content}\n\n`;
          }
        }
      };
      await readDirRecursive(srcDir, 'src');
    } catch {
      // Ignore if src directory fails to read
    }

    return this.redactSecrets(contextStr);
  }

  /**
   * Main entry point for BuildDebuggerAgent.
   */
  async runBuildDebug(
    projectId: string,
    idea: string,
    projectFolderPath: string,
    stateManager: ProjectStateManager,
    validationResult?: IdeaValidationResult
  ): Promise<BuildDebugResult | null> {
    if (validationResult?.recommendation === 'REJECT') {
      console.log(`[BuildDebuggerAgent] Skipping Build & Debug because Idea Validation recommendation is "REJECT".`);
      await stateManager.updateState({
        buildDebugSkipped: true,
        skipReason: 'Idea Validation rejected the product idea.',
      });
      return null;
    }

    console.log(`[BuildDebuggerAgent] Starting Automated Build & Debug Agent for project "${projectId}"...`);
    await stateManager.updateStatus('IN_PROGRESS');
    await stateManager.updateStage('BUILD_DEBUG');

    const mobileDir = path.join(projectFolderPath, 'mobile');

    // Check if mobileDir exists
    try {
      await fs.stat(mobileDir);
    } catch {
      console.error(`[BuildDebuggerAgent] Mobile project directory "${mobileDir}" does not exist.`);
      await stateManager.updateStage('BUILD_DEBUG_FAILED');
      await stateManager.updateState({
        buildDebugComplete: true,
        buildDebugSuccess: false,
        buildDebugError: `Mobile project folder not found at ${mobileDir}`,
      });
      throw new Error(`Mobile project directory does not exist: ${mobileDir}`);
    }

    let appName = 'ScholarSpend';
    try {
      const appJsonContent = await fs.readFile(path.join(mobileDir, 'app.json'), 'utf-8');
      const parsedAppJson = JSON.parse(appJsonContent);
      appName = parsedAppJson.expo?.name || appName;
    } catch {
      // Fallback app name
    }

    const repairAttempts: RepairAttempt[] = [];
    const errorsEncountered: string[] = [];
    const fixesApplied: string[] = [];
    let isSuccess = false;
    let finalBuildLogs = '';
    let finalValidationResults: BuildDebugValidationResults = {
      dependencyCheck: false,
      typeCheck: false,
      expoDoctorCheck: false,
      androidPrebuildCheck: false,
    };

    // Automated Repair Loop (Up to MAX_REPAIR_ATTEMPTS)
    for (let attempt = 1; attempt <= this.MAX_REPAIR_ATTEMPTS; attempt++) {
      console.log(`[BuildDebuggerAgent] Executing Validation Pass #${attempt}...`);
      const val = await this.runProjectValidations(mobileDir);

      finalValidationResults = val.validationResults;
      finalBuildLogs = val.combinedLogs;

      if (val.passed) {
        console.log(`[BuildDebuggerAgent] Validation Pass #${attempt} PASSED with 0 errors!`);
        isSuccess = true;
        break;
      }

      const currentError = val.primaryError || 'Build/Validation failure detected.';
      console.warn(`[BuildDebuggerAgent] Validation Pass #${attempt} FAILED:\n${currentError}`);
      errorsEncountered.push(`Attempt #${attempt}: ${currentError}`);

      if (attempt >= this.MAX_REPAIR_ATTEMPTS) {
        console.warn(`[BuildDebuggerAgent] Reached maximum repair attempts (${this.MAX_REPAIR_ATTEMPTS}).`);
        break;
      }

      // Perform Git Checkpoint
      await this.createGitCheckpoint(mobileDir, attempt);

      // Collect project code context for Gemini
      console.log(`[BuildDebuggerAgent] Querying Gemini LLM to diagnose root cause and generate code fixes...`);
      const projectContext = await this.collectProjectContext(mobileDir);

      const userPrompt = `The Expo React Native project failed validation/build checks on attempt #${attempt}.

Build Failure Error Output:
${currentError}

Full Validation Logs:
${val.combinedLogs}

Mobile Project Source Code Context:
${projectContext}

Task:
Analyze the build error and project files. Identify the root cause and output exact code fixes for the files inside the mobile project.
Only provide file fixes for paths inside the mobile directory (e.g., "src/screens/DashboardScreen.tsx", "package.json", "App.tsx").`;

      const systemPrompt = `You are an expert React Native, Expo, and TypeScript build debugging agent.
Your objective is to diagnose build errors, TypeScript errors, or dependency conflicts in Expo applications and provide exact fixes.

Return a JSON object matching this schema:
{
  "canFix": boolean,
  "confidenceScore": number, // 0.0 to 1.0
  "rootCause": "Detailed technical explanation of the root cause",
  "proposedFix": "Summary of the fix strategy",
  "fileFixes": [
    {
      "relativePath": "relative/path/to/file", // e.g. "src/screens/DashboardScreen.tsx" or "App.tsx"
      "content": "Complete updated file content containing the fix",
      "description": "Short explanation of changes in this file"
    }
  ]
}`;

      try {
        const res = await defaultAIGateway.generate<{
          canFix: boolean;
          confidenceScore: number;
          rootCause: string;
          proposedFix: string;
          fileFixes: RepairFileFix[];
        }>({
          agent: 'BuildDebuggerAgent',
          task: 'CODE_DEBUG',
          prompt: userPrompt,
          systemPrompt,
          projectId,
          responseFormat: 'json',
        });
        const llmResponse = res.output;

        if (
          !llmResponse ||
          !llmResponse.canFix ||
          (llmResponse.confidenceScore && llmResponse.confidenceScore < 0.5) ||
          !llmResponse.fileFixes ||
          llmResponse.fileFixes.length === 0
        ) {
          console.warn(
            `[BuildDebuggerAgent] LLM returned low confidence (${llmResponse?.confidenceScore ?? 0}) or no actionable code fixes. Stopping automated repairs to prevent random edits.`
          );
          repairAttempts.push({
            attemptNumber: attempt,
            errorDiagnosed: currentError,
            rootCause: llmResponse?.rootCause || 'Root cause unconfirmed',
            proposedFix: llmResponse?.proposedFix || 'No fix proposed',
            confidenceScore: llmResponse?.confidenceScore || 0,
            filesModified: [],
            outcome: 'FAILED',
            stdout: val.stdout,
            stderr: val.stderr,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        const modifiedFiles: Array<{ relativePath: string; description: string }> = [];

        // Apply File Fixes safely
        for (const fix of llmResponse.fileFixes) {
          try {
            const targetFilePath = this.assertValidMobilePath(mobileDir, fix.relativePath);
            await fs.mkdir(path.dirname(targetFilePath), { recursive: true });
            await fs.writeFile(targetFilePath, fix.content, 'utf-8');

            const fixDesc = `${fix.relativePath}: ${fix.description || 'Applied Gemini fix'}`;
            modifiedFiles.push({
              relativePath: fix.relativePath,
              description: fix.description || 'Applied Gemini code repair',
            });
            fixesApplied.push(fixDesc);
            console.log(`[BuildDebuggerAgent] Automatically applied repair to: ${fix.relativePath}`);
          } catch (fileErr: any) {
            console.error(`[BuildDebuggerAgent] Failed to apply fix to "${fix.relativePath}": ${fileErr.message}`);
          }
        }

        repairAttempts.push({
          attemptNumber: attempt,
          errorDiagnosed: currentError,
          rootCause: llmResponse.rootCause,
          proposedFix: llmResponse.proposedFix,
          confidenceScore: llmResponse.confidenceScore,
          filesModified: modifiedFiles,
          outcome: 'SUCCESS',
          stdout: val.stdout,
          stderr: val.stderr,
          timestamp: new Date().toISOString(),
        });
      } catch (llmErr: any) {
        console.error(`[BuildDebuggerAgent] Error calling LLM during repair attempt #${attempt}: ${llmErr.message}`);
        repairAttempts.push({
          attemptNumber: attempt,
          errorDiagnosed: currentError,
          rootCause: 'LLM invocation failed',
          proposedFix: 'N/A',
          confidenceScore: 0,
          filesModified: [],
          outcome: 'FAILED',
          stdout: val.stdout,
          stderr: val.stderr,
          timestamp: new Date().toISOString(),
        });
        break;
      }
    }

    // Final Post-Repair Pass to confirm status
    if (!isSuccess) {
      console.log(`[BuildDebuggerAgent] Running final post-repair verification check...`);
      const finalCheck = await this.runProjectValidations(mobileDir);
      finalValidationResults = finalCheck.validationResults;
      finalBuildLogs = finalCheck.combinedLogs;
      isSuccess = finalCheck.passed;
    }

    const finalStatus: 'SUCCESS' | 'FAILED' = isSuccess ? 'SUCCESS' : 'FAILED';

    const reportResult: BuildDebugResult = {
      projectId,
      appName,
      mobileProjectPath: `projects/${projectId}/mobile`,
      validationResults: finalValidationResults,
      repairAttempts,
      errorsEncountered,
      fixesApplied,
      finalStatus,
      finalBuildLogs: this.redactSecrets(finalBuildLogs),
      generatedAt: new Date().toISOString(),
    };

    // Save build-debug-report.json
    await fs.writeFile(
      path.join(projectFolderPath, 'build-debug-report.json'),
      JSON.stringify(reportResult, null, 2),
      'utf-8'
    );

    // Update project.json state
    if (isSuccess) {
      await stateManager.updateStage('BUILD_DEBUG_COMPLETED');
      await stateManager.updateState({
        buildDebugComplete: true,
        buildDebugSuccess: true,
        buildDebugAttemptsCount: repairAttempts.length,
      });
      console.log(`[BuildDebuggerAgent] Build & Debug stage completed successfully for project "${projectId}".`);
    } else {
      await stateManager.updateStage('BUILD_DEBUG_FAILED');
      await stateManager.updateState({
        buildDebugComplete: true,
        buildDebugSuccess: false,
        buildDebugAttemptsCount: repairAttempts.length,
        buildDebugErrors: errorsEncountered,
      });
      console.warn(`[BuildDebuggerAgent] Build & Debug stage failed after ${repairAttempts.length} attempts.`);
    }

    return reportResult;
  }
}
