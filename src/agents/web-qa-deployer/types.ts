export interface RouteTestResult {
  path: string;
  name: string;
  status: 'PASSED' | 'FAILED';
  statusCode?: number;
  error?: string;
}

export interface NavigationTestResult {
  from: string;
  to: string;
  result: 'PASSED' | 'FAILED';
  error?: string;
}

export interface WebQaValidationResults {
  dependencies: 'PASSED' | 'FAILED';
  typescript: 'PASSED' | 'FAILED';
  productionBuild: 'PASSED' | 'FAILED';
  serverHealth: 'PASSED' | 'FAILED';
}

export interface WebQaReport {
  projectId: string;
  appName: string;
  webProjectPath: string;
  buildResult: 'SUCCESS' | 'FAILED';
  serverResult: 'SUCCESS' | 'FAILED';
  previewPort: number;
  routesTested: RouteTestResult[];
  navigationTests: NavigationTestResult[];
  runtimeErrors: string[];
  validationResults: WebQaValidationResults;
  overallQaStatus: 'PASSED' | 'FAILED';
  generatedAt: string;
}

export interface RenderServiceOptions {
  name: string;
  repoUrl?: string;
  branch?: string;
  buildCommand?: string;
  publishPath?: string;
  autoDeploy?: boolean;
}

export interface RenderDeployResult {
  serviceId?: string;
  deployId?: string;
  status: 'RENDER_SETUP_REQUIRED' | 'COMPLETED' | 'FAILED';
  liveUrl?: string;
  durationMs: number;
  errors: string[];
  healthCheckResult: 'NOT_TESTED' | 'PASSED' | 'FAILED';
  requiresSetup: boolean;
  setupRequiredMessage?: string;
}

export interface RenderDeploymentReport {
  projectId: string;
  appName: string;
  githubRepoUrl: string | null;
  serviceId: string | null;
  deploymentId: string | null;
  deploymentStatus: 'RENDER_SETUP_REQUIRED' | 'GITHUB_SETUP_REQUIRED' | 'COMPLETED' | 'FAILED';
  liveUrl: string | null;
  deploymentDurationMs: number;
  deploymentErrors: string[];
  healthCheckResult: 'NOT_TESTED' | 'PASSED' | 'FAILED';
  requiresSetup: boolean;
  setupRequiredMessage: string | null;
  generatedAt: string;
}

export interface IRenderProvider {
  isConfigured(): boolean;
  createOrGetService(options: RenderServiceOptions): Promise<{ serviceId: string; liveUrl?: string }>;
  triggerDeploy(serviceId: string): Promise<{ deployId: string }>;
  getDeployStatus(serviceId: string, deployId: string): Promise<{ status: string; liveUrl?: string }>;
}
