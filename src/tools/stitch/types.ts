export interface StitchScreenResult {
  screenId: string;
  screenName: string;
  stitchScreenId?: string;
  status: 'GENERATED' | 'FAILED' | 'SKIPPED';
  error?: string;
  previewUrl?: string;
  downloadUrl?: string;
  htmlUrl?: string;
  theme?: any;
}

export interface StitchDesignResult {
  projectId: string;
  appName: string;
  stitchProjectId?: string;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
  error?: string;
  screens: StitchScreenResult[];
  designSystemApplied?: boolean;
  generatedAt: string;
}

export interface IStitchProvider {
  name: string;
  createProject(title: string): Promise<{ id: string; name: string }>;
  generateScreen(
    projectId: string,
    screenName: string,
    prompt: string
  ): Promise<{ screenId: string; previewUrl?: string; downloadUrl?: string; htmlUrl?: string; theme?: any }>;
}
