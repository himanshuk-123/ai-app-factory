export interface RepairFileFix {
  relativePath: string;
  content: string;
  description?: string;
}

export interface RepairAttempt {
  attemptNumber: number;
  errorDiagnosed: string;
  rootCause: string;
  proposedFix: string;
  confidenceScore: number;
  filesModified: Array<{ relativePath: string; description: string }>;
  outcome: 'SUCCESS' | 'FAILED';
  stdout: string;
  stderr: string;
  timestamp: string;
}

export interface BuildDebugValidationResults {
  dependencyCheck: boolean;
  typeCheck: boolean;
  expoDoctorCheck: boolean;
  androidPrebuildCheck: boolean;
}

export interface BuildDebugResult {
  projectId: string;
  appName: string;
  mobileProjectPath: string;
  validationResults: BuildDebugValidationResults;
  repairAttempts: RepairAttempt[];
  errorsEncountered: string[];
  fixesApplied: string[];
  finalStatus: 'SUCCESS' | 'FAILED';
  finalBuildLogs: string;
  generatedAt: string;
}
