export type ApkBuildStatus = 'SUCCESS' | 'FAILED' | 'AUTHENTICATION_REQUIRED' | 'SKIPPED';

export interface ApkBuildReport {
  projectId: string;
  appName: string;
  mobileProjectPath: string;
  buildId: string;
  platform: 'android';
  profile: string;
  buildStatus: ApkBuildStatus;
  apkArtifactPath?: string;
  apkArtifactUrl?: string;
  buildDurationMs: number;
  errors: string[];
  warnings: string[];
  requiresUserAction?: string;
  generatedAt: string;
}
