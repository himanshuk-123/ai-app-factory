export type VisualQaIssueSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type VisualQaCategory =
  | 'LAYOUT'
  | 'SPACING'
  | 'ALIGNMENT'
  | 'COLORS'
  | 'TYPOGRAPHY'
  | 'BUTTONS'
  | 'CARDS'
  | 'ICONS'
  | 'MISSING_ELEMENTS'
  | 'EXTRA_ELEMENTS';

export interface VisualQaIssue {
  category: VisualQaCategory;
  severity: VisualQaIssueSeverity;
  description: string;
  element: string;
  expected: string;
  actual: string;
}

export interface ScreenVisualQaResult {
  screenId: string;
  screenName: string;
  screenshotPath: string;
  referenceUsed: string;
  similarityScore: number; // 0 - 100
  issues: VisualQaIssue[];
  summary: string;
}

export type OverallVisualQaStatus = 'PASSED' | 'FAILED' | 'NEEDS_ATTENTION';

export interface VisualQaReport {
  projectId: string;
  appName: string;
  screensCompared: ScreenVisualQaResult[];
  overallSimilarityScore: number; // 0 - 100
  totalIssuesCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  overallStatus: OverallVisualQaStatus;
  comparisonMethod: string;
  durationMs: number;
  generatedAt: string;
}
