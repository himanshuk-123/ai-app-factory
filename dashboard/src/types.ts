export type StageStatus = 'WAITING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'SKIPPED';

export interface WorkflowStageNode {
  number: number;
  id: string;
  name: string;
  shortDesc: string;
  agent: string;
  iconName: string;
  status: StageStatus;
  durationMs?: number;
  artifactPath?: string;
  error?: string;
  currentOperation?: string;
}

export interface WorkflowEvent {
  id: string;
  projectId: string;
  stage: number;
  agent: string;
  type:
    | 'WORKFLOW_STARTED'
    | 'AGENT_STARTED'
    | 'AGENT_PROGRESS'
    | 'LOG'
    | 'ARTIFACT_CREATED'
    | 'AGENT_COMPLETED'
    | 'AGENT_FAILED'
    | 'WORKFLOW_COMPLETED'
    | 'WORKFLOW_FAILED';
  status?: StageStatus;
  message?: string;
  progress?: number;
  artifactPath?: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface ProjectMetadata {
  id: string;
  idea: string;
  status: 'INITIALIZED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  stage: string;
  createdAt: string;
  updatedAt: string;
  appName?: string;
  ideaValidationComplete?: boolean;
  score?: number;
  recommendation?: string;
  marketResearchComplete?: boolean;
  productSpecComplete?: boolean;
  uxSpecComplete?: boolean;
  stitchDesignComplete?: boolean;
  webGenerationComplete?: boolean;
  mobileGenerationComplete?: boolean;
  buildDebugComplete?: boolean;
  apkBuildComplete?: boolean;
  apkArtifactPath?: string;
  apkArtifactUrl?: string;
  androidQaComplete?: boolean;
  androidQaStatus?: string;
  deviceModel?: string;
  androidVersion?: string;
  visualQaComplete?: boolean;
  overallSimilarityScore?: number;
  visualAutoFixComplete?: boolean;
  beforeSimilarityScore?: number;
  afterSimilarityScore?: number;
  webQaComplete?: boolean;
  webQaStatus?: string;
  githubRepositoryComplete?: boolean;
  githubRepoName?: string;
  githubRepoUrl?: string;
  renderDeploymentComplete?: boolean;
  renderDeploymentStatus?: string;
  renderServiceId?: string;
  renderLiveUrl?: string;
}

export interface ProjectData {
  metadata: ProjectMetadata;
  reports: Record<string, any>;
  events: WorkflowEvent[];
}
