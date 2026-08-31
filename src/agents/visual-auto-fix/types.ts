import type { VisualQaIssue, VisualQaIssueSeverity } from '../visual-qa/types.js';

export interface FileModificationRecord {
  filePath: string; // Relative path inside mobile/
  reason: string;
}

export interface VisualRepairIteration {
  iteration: number;
  issuesAddressed: VisualQaIssue[];
  filesModified: FileModificationRecord[];
  tscSuccess: boolean;
  expoSuccess: boolean;
  apkBuildStatus?: string;
  androidQaStatus?: string;
  visualQaStatus?: string;
  beforeSimilarityScore: number;
  afterSimilarityScore: number;
  rollbackOccurred: boolean;
  details?: string;
}

export interface VisualAutoFixReport {
  projectId: string;
  appName: string;
  repairIterations: VisualRepairIteration[];
  totalIssuesDetected: number;
  totalIssuesFixed: number;
  filesModified: string[];
  beforeSimilarityScore: number;
  afterSimilarityScore: number;
  apkBuildResult: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  androidQaResult: 'COMPLETED' | 'FAILED' | 'SKIPPED';
  visualQaResult: 'PASSED' | 'FAILED' | 'NEEDS_ATTENTION' | 'SKIPPED';
  rollbackEventsCount: number;
  remainingIssues: VisualQaIssue[];
  overallStatus: 'COMPLETED' | 'FAILED' | 'NO_FIXES_NEEDED';
  durationMs: number;
  generatedAt: string;
}
