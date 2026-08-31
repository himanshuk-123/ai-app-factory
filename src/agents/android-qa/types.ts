export type OverallQaStatus =
  | 'PASSED'
  | 'FAILED'
  | 'PARTIAL'
  | 'NO_DEVICE_DETECTED'
  | 'SETUP_REQUIRED';

export interface ScreenTestResult {
  screenId: string;
  name: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  selectorUsed?: string;
  screenshotPath: string;
  details?: string;
}

export interface NavigationTestResult {
  flow: string;
  fromScreen: string;
  toScreen: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  details?: string;
}

export interface InteractionTestResult {
  action: string;
  target: string;
  selector?: string;
  result: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  details?: string;
}

export interface AndroidQaReport {
  projectId: string;
  appName: string;
  deviceId: string;
  deviceModel: string;
  androidVersion: string;
  apkTestedPath: string;
  packageName: string;
  automationFramework: string;
  installationResult: 'SUCCESS' | 'FAILED';
  launchResult: 'SUCCESS' | 'FAILED';
  screensTested: ScreenTestResult[];
  navigationResults: NavigationTestResult[];
  interactionResults: InteractionTestResult[];
  crashesAndErrors: string[];
  logcatLogPath: string;
  screenshotPaths: string[];
  requiresUserSetup?: string;
  overallQaStatus: OverallQaStatus;
  durationMs: number;
  generatedAt: string;
}
