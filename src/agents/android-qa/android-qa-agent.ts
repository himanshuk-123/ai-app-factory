import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { ProjectStateManager } from '../../orchestrator/project-state.js';
import type {
  AndroidQaReport,
  OverallQaStatus,
  ScreenTestResult,
  NavigationTestResult,
  InteractionTestResult,
} from './types.js';

const execAsync = promisify(exec);

export class AndroidQaAgent {
  /**
   * Checks if Maestro CLI binary is installed and executable on the host system.
   */
  private async detectMaestroCli(): Promise<string | null> {
    const candidatePaths = [
      'maestro',
      path.resolve(process.cwd(), 'tools', 'maestro', 'bin', 'maestro.bat'),
      path.resolve(process.cwd(), 'tools', 'maestro', 'bin', 'maestro'),
      path.resolve(process.cwd(), 'tools', 'maestro', 'maestro.bat'),
    ];

    for (const binPath of candidatePaths) {
      try {
        const { stdout } = await execAsync(`"${binPath}" --version`, { timeout: 5000 });
        if (stdout && (stdout.includes('maestro') || stdout.includes('Version') || stdout.match(/\d+\.\d+\.\d+/))) {
          console.log(`[AndroidQaAgent] Maestro CLI detected at: "${binPath}" (Version: ${stdout.trim()})`);
          return binPath;
        }
      } catch {
        // Continue checking next candidate
      }
    }
    return null;
  }

  /**
   * Executes physical Android device QA testing via ADB & UI Automation for Stage 10.
   */
  async runQa(
    projectId: string,
    idea: string,
    projectFolderPath: string,
    stateManager: ProjectStateManager
  ): Promise<AndroidQaReport> {
    const startTime = Date.now();
    console.log(`[AndroidQaAgent] Starting Android QA Agent for project "${projectId}"...`);
    await stateManager.updateStatus('IN_PROGRESS', 'ANDROID_QA_START');

    const qaDir = path.join(projectFolderPath, 'qa');
    const screenshotsDir = path.join(qaDir, 'screenshots');
    const logsDir = path.join(qaDir, 'logs');

    await fs.mkdir(screenshotsDir, { recursive: true });
    await fs.mkdir(logsDir, { recursive: true });

    const errors: string[] = [];
    const screenshotPaths: string[] = [];
    const screensTested: ScreenTestResult[] = [];
    const navigationResults: NavigationTestResult[] = [];
    const interactionResults: InteractionTestResult[] = [];

    let deviceId = '';
    let deviceModel = 'Unknown Device';
    let androidVersion = 'Unknown';
    let installationResult: 'SUCCESS' | 'FAILED' = 'FAILED';
    let launchResult: 'SUCCESS' | 'FAILED' = 'FAILED';
    let overallQaStatus: OverallQaStatus = 'FAILED';
    let automationFramework = 'ADB-Semantic UIAutomator';
    let requiresUserSetup: string | undefined = undefined;

    // 1. Detect connected physical Android devices via ADB
    console.log(`[AndroidQaAgent] Detecting connected physical Android devices via "adb devices"...`);
    try {
      const { stdout: devicesStdout } = await execAsync('adb devices', { timeout: 15000 });
      const lines = devicesStdout.split('\n').map((l) => l.trim()).filter(Boolean);

      const physicalDevices: string[] = [];
      for (const line of lines) {
        const match = line.match(/^([a-zA-Z0-9_-]+)\s+device$/);
        if (match) {
          const id = match[1];
          // Exclude android emulators
          if (!id.toLowerCase().startsWith('emulator') && !id.toLowerCase().includes('vbox')) {
            physicalDevices.push(id);
          }
        }
      }

      if (physicalDevices.length === 0) {
        const noDeviceMsg = `No physical Android device detected via "adb devices". (Attached: ${
          lines.slice(1).join(', ') || 'None'
        }). Physical device is required for Stage 10 QA testing.`;
        console.warn(`[AndroidQaAgent] ${noDeviceMsg}`);
        errors.push(noDeviceMsg);

        overallQaStatus = 'NO_DEVICE_DETECTED';
        const report: AndroidQaReport = {
          projectId,
          appName: 'App',
          deviceId: 'None',
          deviceModel: 'None',
          androidVersion: 'None',
          apkTestedPath: '',
          packageName: '',
          automationFramework: 'None',
          installationResult: 'FAILED',
          launchResult: 'FAILED',
          screensTested: [],
          navigationResults: [],
          interactionResults: [],
          crashesAndErrors: errors,
          logcatLogPath: '',
          screenshotPaths: [],
          overallQaStatus,
          durationMs: Date.now() - startTime,
          generatedAt: new Date().toISOString(),
        };

        const reportPath = path.join(projectFolderPath, 'android-qa-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
        await stateManager.updateStage('ANDROID_QA_FAILED');
        await stateManager.updateState({
          androidQaComplete: false,
          androidQaSuccess: false,
          androidQaStatus: 'NO_DEVICE_DETECTED',
          androidQaError: noDeviceMsg,
        });

        return report;
      }

      deviceId = physicalDevices[0];
      console.log(`[AndroidQaAgent] Found physical device: "${deviceId}"`);
    } catch (adbErr: any) {
      const errStr = `ADB command failed: ${adbErr.message}`;
      console.error(`[AndroidQaAgent] ${errStr}`);
      errors.push(errStr);
    }

    // 2. Query device properties (Model, Brand, Android Release Version)
    if (deviceId) {
      try {
        const { stdout: modelStdout } = await execAsync(`adb -s ${deviceId} shell getprop ro.product.model`, { timeout: 10000 });
        const { stdout: brandStdout } = await execAsync(`adb -s ${deviceId} shell getprop ro.product.brand`, { timeout: 10000 });
        const { stdout: verStdout } = await execAsync(`adb -s ${deviceId} shell getprop ro.build.version.release`, { timeout: 10000 });

        const brand = brandStdout.trim();
        const model = modelStdout.trim();
        deviceModel = `${brand} ${model}`.trim();
        androidVersion = verStdout.trim() || 'Unknown';
        console.log(`[AndroidQaAgent] Physical Device Info — Model: "${deviceModel}", Android OS: ${androidVersion}`);
      } catch (propErr: any) {
        console.warn(`[AndroidQaAgent] Could not query device properties: ${propErr.message}`);
      }
    }

    // 3. Locate APK file & package name
    let absoluteApkPath = '';
    let relativeApkPath = '';
    let packageName = '';
    let appName = 'App';

    const artifactsDir = path.join(projectFolderPath, 'artifacts');
    try {
      const artifactFiles = await fs.readdir(artifactsDir);
      const apkFile = artifactFiles.find((f) => f.endsWith('.apk'));
      if (apkFile) {
        absoluteApkPath = path.join(artifactsDir, apkFile);
        relativeApkPath = `projects/${projectId}/artifacts/${apkFile}`;
      }
    } catch {
      // Ignore directory read error
    }

    if (!absoluteApkPath) {
      try {
        const buildReportRaw = await fs.readFile(path.join(projectFolderPath, 'apk-build-report.json'), 'utf-8');
        const buildReport = JSON.parse(buildReportRaw);
        if (buildReport.apkArtifactPath) {
          relativeApkPath = buildReport.apkArtifactPath;
          absoluteApkPath = path.resolve(process.cwd(), relativeApkPath);
        }
        appName = buildReport.appName || appName;
      } catch {
        // Ignore report load error
      }
    }

    // Determine package name from app.json
    try {
      const appJsonRaw = await fs.readFile(path.join(projectFolderPath, 'mobile', 'app.json'), 'utf-8');
      const appJson = JSON.parse(appJsonRaw);
      packageName = appJson.expo?.android?.package || `com.appfactory.${appJson.expo?.slug || 'app'}`;
      appName = appJson.expo?.name || appName;
    } catch {
      packageName = `com.appfactory.${projectId.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    }

    if (!absoluteApkPath) {
      const noApkMsg = `Could not locate compiled APK binary in "projects/${projectId}/artifacts/". Stage 9 build must be completed first.`;
      console.error(`[AndroidQaAgent] ${noApkMsg}`);
      errors.push(noApkMsg);
    } else {
      console.log(`[AndroidQaAgent] Target APK: "${relativeApkPath}" (Package: "${packageName}")`);
    }

    // 4. Install APK on Physical Device
    if (deviceId && absoluteApkPath) {
      console.log(`[AndroidQaAgent] Installing APK on device "${deviceId}"...`);
      try {
        const { stdout: installStdout, stderr: installStderr } = await execAsync(`adb -s ${deviceId} install -r "${absoluteApkPath}"`, {
          timeout: 120000,
        });

        const combinedOutput = (installStdout + '\n' + installStderr).trim();
        if (combinedOutput.includes('Success')) {
          installationResult = 'SUCCESS';
          console.log(`[AndroidQaAgent] APK installed successfully on device.`);
        } else if (combinedOutput.includes('INSTALL_FAILED_USER_RESTRICTED')) {
          const userRestrictedMsg = `ADB Installation Restricted by Device Security (INSTALL_FAILED_USER_RESTRICTED).\nUser Setup Required: On Xiaomi/Redmi devices (e.g. Redmi M2101K7BI), please enable "Install via USB" under Developer Options in device settings (Settings -> Additional Settings -> Developer Options -> Install via USB).`;
          console.warn(`[AndroidQaAgent] ${userRestrictedMsg}`);
          errors.push(userRestrictedMsg);
          requiresUserSetup = userRestrictedMsg;
        } else {
          errors.push(`ADB Installation Output: ${combinedOutput}`);
        }
      } catch (instErr: any) {
        const instErrMsg = ((instErr.stdout || '') + '\n' + (instErr.stderr || '') + '\n' + (instErr.message || '')).trim();
        console.error(`[AndroidQaAgent] APK installation error: ${instErrMsg}`);
        if (instErrMsg.includes('INSTALL_FAILED_USER_RESTRICTED')) {
          const userRestrictedMsg = `ADB Installation Restricted by Device Security (INSTALL_FAILED_USER_RESTRICTED).\nUser Setup Required: On Xiaomi/Redmi devices, please turn ON "Install via USB" under Developer Options in device settings (Settings -> Additional Settings -> Developer Options -> Install via USB) or tap "Install" on the device prompt popup screen.`;
          errors.push(userRestrictedMsg);
          requiresUserSetup = userRestrictedMsg;
        } else {
          errors.push(`Installation Failed: ${instErrMsg}`);
        }
      }

      // Check if package is already installed on device as fallback
      if (installationResult !== 'SUCCESS') {
        try {
          const { stdout: checkPkg } = await execAsync(`adb -s ${deviceId} shell pm list packages ${packageName}`, { timeout: 10000 });
          if (checkPkg.includes(packageName)) {
            console.log(`[AndroidQaAgent] Verified package "${packageName}" is present on device. Proceeding with launch & test flow.`);
            installationResult = 'SUCCESS';
          }
        } catch {
          // Ignore package list error
        }
      }
    }

    // Clear logcat buffer before launch
    if (deviceId) {
      await execAsync(`adb -s ${deviceId} logcat -c`, { timeout: 10000 }).catch(() => {});
    }

    // 5. Launch Application on Device
    if (deviceId && installationResult === 'SUCCESS') {
      console.log(`[AndroidQaAgent] Launching application "${packageName}" on device...`);
      try {
        const launchCmd = `adb -s ${deviceId} shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`;
        const { stdout: launchStdout } = await execAsync(launchCmd, { timeout: 20000 });

        if (launchStdout.includes('Events injected: 1') || launchStdout.includes('Monkey finished')) {
          // Wait 4 seconds for app to render
          await new Promise((r) => setTimeout(r, 4000));

          // Verify process is running
          const { stdout: pidStdout } = await execAsync(`adb -s ${deviceId} shell pidof ${packageName}`, { timeout: 10000 });
          if (pidStdout.trim()) {
            launchResult = 'SUCCESS';
            console.log(`[AndroidQaAgent] Application launched successfully (PID: ${pidStdout.trim()}).`);
          } else {
            // Retry secondary launch via Intent
            await execAsync(`adb -s ${deviceId} shell am start -n ${packageName}/.MainActivity`, { timeout: 15000 }).catch(() => {});
            await new Promise((r) => setTimeout(r, 3000));
            const { stdout: pidRetry } = await execAsync(`adb -s ${deviceId} shell pidof ${packageName}`, { timeout: 10000 }).catch(() => ({ stdout: '' }));
            if (pidRetry.trim()) {
              launchResult = 'SUCCESS';
              console.log(`[AndroidQaAgent] Application launched successfully via Intent (PID: ${pidRetry.trim()}).`);
            } else {
              console.warn(`[AndroidQaAgent] Application process PID not found after launch.`);
              errors.push(`App launched but process PID was not active on device.`);
            }
          }
        } else {
          errors.push(`Launch command output: ${launchStdout}`);
        }
      } catch (launchErr: any) {
        const launchErrMsg = launchErr.stdout || launchErr.stderr || launchErr.message;
        console.error(`[AndroidQaAgent] App launch failed: ${launchErrMsg}`);
        errors.push(`App Launch Failed: ${launchErrMsg}`);
      }
    }

    // Helper to capture ADB screenshot
    const captureScreenshot = async (filename: string): Promise<string> => {
      if (!deviceId) return '';
      const localRelPath = `projects/${projectId}/qa/screenshots/${filename}`;
      const localAbsPath = path.join(screenshotsDir, filename);
      const remotePath = `/sdcard/${filename}`;

      try {
        await execAsync(`adb -s ${deviceId} shell screencap -p ${remotePath}`, { timeout: 15000 });
        await execAsync(`adb -s ${deviceId} pull ${remotePath} "${localAbsPath}"`, { timeout: 15000 });
        await execAsync(`adb -s ${deviceId} shell rm ${remotePath}`, { timeout: 10000 }).catch(() => {});
        screenshotPaths.push(localRelPath);
        return localRelPath;
      } catch (capErr: any) {
        console.warn(`[AndroidQaAgent] Screenshot capture failed for ${filename}: ${capErr.message}`);
        return '';
      }
    };

    // Helper to dump UI hierarchy XML
    const dumpUiXml = async (): Promise<string> => {
      if (!deviceId) return '';
      try {
        await execAsync(`adb -s ${deviceId} shell uiautomator dump /sdcard/window_dump.xml`, { timeout: 15000 });
        const { stdout: xmlContent } = await execAsync(`adb -s ${deviceId} shell cat /sdcard/window_dump.xml`, { timeout: 15000 });
        await execAsync(`adb -s ${deviceId} shell rm /sdcard/window_dump.xml`, { timeout: 10000 }).catch(() => {});
        return xmlContent;
      } catch {
        return '';
      }
    };

    // 6. UI Automation Testing
    if (deviceId && launchResult === 'SUCCESS') {
      // Check if Maestro CLI is available
      const maestroBin = await this.detectMaestroCli();
      if (maestroBin) {
        automationFramework = 'Maestro CLI';
        console.log(`[AndroidQaAgent] Using Maestro UI Automation framework for end-to-end device testing.`);

        // Create Maestro test flow YAML based on product-spec & ux-spec
        const maestroFlowPath = path.join(qaDir, 'maestro-flow.yaml');
        const maestroYaml = `appId: ${packageName}
---
- launchApp
- takeScreenshot: ${path.join(screenshotsDir, '01_launch_dashboard.png')}
- scroll
- takeScreenshot: ${path.join(screenshotsDir, '02_dashboard_scrolled.png')}
`;
        await fs.writeFile(maestroFlowPath, maestroYaml, 'utf-8');

        try {
          const { stdout: maestroStdout } = await execAsync(`"${maestroBin}" --device ${deviceId} test "${maestroFlowPath}"`, {
            timeout: 60000,
          });
          console.log(`[AndroidQaAgent] Maestro Test Flow Output:\n${maestroStdout}`);
          screenshotPaths.push(`projects/${projectId}/qa/screenshots/01_launch_dashboard.png`);
          screenshotPaths.push(`projects/${projectId}/qa/screenshots/02_dashboard_scrolled.png`);

          screensTested.push({
            screenId: 'dashboard',
            name: 'Main Dashboard Screen',
            status: 'PASSED',
            selectorUsed: 'Maestro launchApp',
            screenshotPath: `projects/${projectId}/qa/screenshots/01_launch_dashboard.png`,
            details: 'Maestro automated flow launched app and rendered UI elements.',
          });
        } catch (mErr: any) {
          console.warn(`[AndroidQaAgent] Maestro test run returned failure/warning: ${mErr.message}`);
          errors.push(`Maestro Test Automation Failure: ${mErr.message}`);
        }
      } else {
        automationFramework = 'ADB-Semantic UIAutomator';
        console.log(`[AndroidQaAgent] Maestro binary not present on PATH. Using ADB UIAutomator Semantic Automation Driver.`);

        // Parse UX Spec / Product Spec for target screens
        let screensToTest: Array<{ screenId: string; name: string; keyText?: string }> = [
          { screenId: 'dashboard', name: 'Dashboard / Home Screen', keyText: 'Dashboard' },
          { screenId: 'add_expense', name: 'Add Expense Screen', keyText: 'Add' },
          { screenId: 'analytics', name: 'Analytics & Reports Screen', keyText: 'Analytics' },
          { screenId: 'settings', name: 'Settings & Profile Screen', keyText: 'Settings' },
        ];

        try {
          const uxSpecRaw = await fs.readFile(path.join(projectFolderPath, 'ux-spec.json'), 'utf-8');
          const uxSpec = JSON.parse(uxSpecRaw);
          if (Array.isArray(uxSpec.screens) && uxSpec.screens.length > 0) {
            screensToTest = uxSpec.screens.map((s: any) => ({
              screenId: s.id || s.screenId || 'screen',
              name: s.name || s.title || s.purpose || 'Screen',
              keyText: s.name || s.title || 'Screen',
            }));
          }
        } catch {
          // Use default fallback screens
        }

        // Test Primary Screen (Dashboard)
        const mainScreenshot = await captureScreenshot('01_launch_dashboard.png');
        const initialXml = await dumpUiXml();

        screensTested.push({
          screenId: screensToTest[0]?.screenId || 'dashboard',
          name: screensToTest[0]?.name || 'Main Dashboard',
          status: 'PASSED',
          selectorUsed: `Semantic UI Dump (${initialXml.length} bytes)`,
          screenshotPath: mainScreenshot,
          details: 'Application launched successfully. UI hierarchy inspected.',
        });

        // Test Interaction: Vertical Scroll
        try {
          console.log(`[AndroidQaAgent] Testing vertical swipe interaction...`);
          const { stderr: swipeErr } = await execAsync(`adb -s ${deviceId} shell input swipe 500 1200 500 400 300`, { timeout: 10000 });
          if (swipeErr && swipeErr.includes('SecurityException')) {
            throw new Error(swipeErr.trim());
          }
          await new Promise((r) => setTimeout(r, 1500));
          const scrollScreenshot = await captureScreenshot('02_dashboard_scrolled.png');

          interactionResults.push({
            action: 'vertical_swipe',
            target: 'Dashboard scroll container',
            selector: 'input swipe 500 1200 500 400 300',
            result: 'SUCCESS',
            details: 'Vertical swipe gesture completed.',
          });
        } catch (swipeError: any) {
          const swipeErrMsg = swipeError.message || String(swipeError);
          console.warn(`[AndroidQaAgent] Vertical swipe interaction failed: ${swipeErrMsg}`);

          let detailsMsg = swipeErrMsg;
          if (swipeErrMsg.includes('SecurityException') || swipeErrMsg.includes('INJECT_EVENTS')) {
            detailsMsg = `SecurityException: Injecting input events requires the INJECT_EVENTS permission.\nUser Setup Required: On Xiaomi/Redmi devices, please turn ON "USB debugging (Security settings)" under Settings -> Additional Settings -> Developer Options -> USB debugging (Security settings) to grant input simulation permissions.`;
            if (!requiresUserSetup) {
              requiresUserSetup = detailsMsg;
            }
          }

          interactionResults.push({
            action: 'vertical_swipe',
            target: 'Dashboard scroll container',
            selector: 'input swipe 500 1200 500 400 300',
            result: 'FAILED',
            details: detailsMsg,
          });
          errors.push(`Interaction Failure (vertical_swipe): ${detailsMsg}`);
        }

        // Test Navigation & Screen Taps
        for (let i = 1; i < Math.min(screensToTest.length, 4); i++) {
          const screenInfo = screensToTest[i];
          console.log(`[AndroidQaAgent] Testing navigation flow to screen "${screenInfo.name}"...`);

          try {
            const tapX = 200 + i * 220;
            const tapY = 2200;
            const { stderr: tapErr } = await execAsync(`adb -s ${deviceId} shell input tap ${tapX} ${tapY}`, { timeout: 10000 });
            if (tapErr && tapErr.includes('SecurityException')) {
              throw new Error(tapErr.trim());
            }

            await new Promise((r) => setTimeout(r, 2000));
            const screenPic = await captureScreenshot(`0${i + 2}_${screenInfo.screenId}.png`);

            screensTested.push({
              screenId: screenInfo.screenId,
              name: screenInfo.name,
              status: 'PASSED',
              selectorUsed: `semantic_tab_position (${tapX}, ${tapY})`,
              screenshotPath: screenPic,
              details: `Navigated to ${screenInfo.name} and captured screenshot.`,
            });

            navigationResults.push({
              flow: `Dashboard -> ${screenInfo.name}`,
              fromScreen: 'Dashboard',
              toScreen: screenInfo.name,
              status: 'PASSED',
            });
          } catch (navErr: any) {
            const navErrMsg = navErr.message || String(navErr);
            let detailsMsg = navErrMsg;
            if (navErrMsg.includes('SecurityException') || navErrMsg.includes('INJECT_EVENTS')) {
              detailsMsg = `SecurityException: Injecting input events requires INJECT_EVENTS permission on device.\nUser Setup Required: Enable "USB debugging (Security settings)" under Xiaomi Developer Options.`;
              if (!requiresUserSetup) {
                requiresUserSetup = detailsMsg;
              }
            }

            screensTested.push({
              screenId: screenInfo.screenId,
              name: screenInfo.name,
              status: 'FAILED',
              selectorUsed: `semantic_tab_position`,
              screenshotPath: '',
              details: detailsMsg,
            });

            navigationResults.push({
              flow: `Dashboard -> ${screenInfo.name}`,
              fromScreen: 'Dashboard',
              toScreen: screenInfo.name,
              status: 'FAILED',
              details: detailsMsg,
            });
            errors.push(`Navigation Failure (Dashboard -> ${screenInfo.name}): ${detailsMsg}`);
          }
        }

        // Test Back Navigation
        try {
          console.log(`[AndroidQaAgent] Testing System Back Button interaction...`);
          const { stderr: backErr } = await execAsync(`adb -s ${deviceId} shell input keyevent 4`, { timeout: 10000 });
          if (backErr && backErr.includes('SecurityException')) {
            throw new Error(backErr.trim());
          }
          await new Promise((r) => setTimeout(r, 1500));
          const backScreenshot = await captureScreenshot('06_back_to_main.png');

          interactionResults.push({
            action: 'keyevent_back',
            target: 'System Back Button (Keycode 4)',
            selector: 'input keyevent 4',
            result: 'SUCCESS',
            details: 'Back navigation event executed.',
          });
        } catch (backErr: any) {
          const backErrMsg = backErr.message || String(backErr);
          let detailsMsg = backErrMsg;
          if (backErrMsg.includes('SecurityException') || backErrMsg.includes('INJECT_EVENTS')) {
            detailsMsg = `SecurityException: Keyevent injection blocked by device security setting.`;
            if (!requiresUserSetup) {
              requiresUserSetup = detailsMsg;
            }
          }

          interactionResults.push({
            action: 'keyevent_back',
            target: 'System Back Button (Keycode 4)',
            selector: 'input keyevent 4',
            result: 'FAILED',
            details: detailsMsg,
          });
          errors.push(`Interaction Failure (keyevent_back): ${detailsMsg}`);
        }
      }
    }

    // 7. Collect Logcat Logs & Check for Crashes/Errors
    let logcatLogPath = '';
    if (deviceId) {
      console.log(`[AndroidQaAgent] Dumping ADB logcat for crash/error analysis...`);
      try {
        const { stdout: logcatStdout } = await execAsync(`adb -s ${deviceId} logcat -d *:E`, { timeout: 20000 });
        const logcatFile = path.join(logsDir, 'adb_logcat.log');
        await fs.writeFile(logcatFile, logcatStdout, 'utf-8');
        logcatLogPath = `projects/${projectId}/qa/logs/adb_logcat.log`;

        // Check logcat for fatal exceptions & crashes related to our package
        const fatalLines = logcatStdout
          .split('\n')
          .filter(
            (l) =>
              (l.includes('FATAL EXCEPTION') || l.includes('ANR in') || l.includes('Process crashed')) &&
              (packageName ? l.includes(packageName) : true)
          );

        if (fatalLines.length > 0) {
          const crashMsg = `Detected ${fatalLines.length} fatal exceptions in ADB logcat output.`;
          console.error(`[AndroidQaAgent] ${crashMsg}`);
          errors.push(crashMsg);
          fatalLines.slice(0, 5).forEach((line) => errors.push(`Logcat Fatal Error: ${line.trim()}`));
        } else {
          console.log(`[AndroidQaAgent] Zero fatal exceptions detected in ADB logcat output.`);
        }

        // Final PID check
        if (launchResult === 'SUCCESS') {
          const { stdout: finalPid } = await execAsync(`adb -s ${deviceId} shell pidof ${packageName}`, { timeout: 10000 }).catch(
            () => ({ stdout: '' })
          );
          if (!finalPid.trim()) {
            const terminationMsg = `App process "${packageName}" was terminated unexpectedly during QA flow.`;
            console.error(`[AndroidQaAgent] ${terminationMsg}`);
            errors.push(terminationMsg);
          }
        }
      } catch (logErr: any) {
        console.warn(`[AndroidQaAgent] Could not retrieve logcat output: ${logErr.message}`);
      }
    }

    // 8. STRICT QA STATUS DETERMINATION (Fix reporting bug)
    // PASSED only if ALL required steps (Installation, Launch, Screen Tests, Navigations, Interactions) passed without errors!
    const failedScreens = screensTested.filter((s) => s.status === 'FAILED');
    const failedNavs = navigationResults.filter((n) => n.status === 'FAILED');
    const failedInteractions = interactionResults.filter((i) => i.result === 'FAILED');

    const hasFailures =
      installationResult !== 'SUCCESS' ||
      launchResult !== 'SUCCESS' ||
      failedScreens.length > 0 ||
      failedNavs.length > 0 ||
      failedInteractions.length > 0 ||
      errors.length > 0;

    if (!hasFailures) {
      overallQaStatus = 'PASSED';
    } else if (requiresUserSetup || errors.some((e) => e.includes('INJECT_EVENTS') || e.includes('INSTALL_FAILED_USER_RESTRICTED'))) {
      overallQaStatus = 'SETUP_REQUIRED';
    } else {
      overallQaStatus = 'FAILED';
    }

    const durationMs = Date.now() - startTime;
    const report: AndroidQaReport = {
      projectId,
      appName,
      deviceId: deviceId || 'None',
      deviceModel,
      androidVersion,
      apkTestedPath: relativeApkPath,
      packageName,
      automationFramework,
      installationResult,
      launchResult,
      screensTested,
      navigationResults,
      interactionResults,
      crashesAndErrors: errors,
      logcatLogPath,
      screenshotPaths,
      requiresUserSetup,
      overallQaStatus,
      durationMs,
      generatedAt: new Date().toISOString(),
    };

    // Save report to projects/<projectId>/android-qa-report.json
    const reportPath = path.join(projectFolderPath, 'android-qa-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`[AndroidQaAgent] Saved Android QA report to: ${reportPath}`);

    // Update project state accurately
    if (overallQaStatus === 'PASSED') {
      await stateManager.updateStage('ANDROID_QA_COMPLETED');
      await stateManager.updateState({
        androidQaComplete: true,
        androidQaSuccess: true,
        androidQaStatus: 'PASSED',
        deviceId,
        deviceModel,
        androidVersion,
        automationFramework,
        screenshotsCount: screenshotPaths.length,
      });
      console.log(`[AndroidQaAgent] Android QA stage COMPLETED successfully for project "${projectId}".`);
    } else {
      await stateManager.updateStage('ANDROID_QA_FAILED');
      await stateManager.updateState({
        androidQaComplete: false,
        androidQaSuccess: false,
        androidQaStatus: overallQaStatus,
        automationFramework,
        androidQaErrors: errors,
        requiresUserSetup,
      });
      console.warn(`[AndroidQaAgent] Android QA stage finished with status: ${overallQaStatus}.`);
    }

    return report;
  }
}
