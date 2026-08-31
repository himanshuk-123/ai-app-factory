export interface GitHubRepoOptions {
  repoName: string;
  description?: string;
  isPrivate?: boolean;
  webDir: string;
}

export interface GitHubRepoResult {
  repoName: string;
  repoUrl: string;
  cloneUrl: string;
  commitSha?: string;
  filesPushedCount?: number;
  status: 'COMPLETED' | 'GITHUB_SETUP_REQUIRED' | 'FAILED';
  requiresSetup: boolean;
  setupRequiredMessage?: string;
  error?: string;
}

export interface GitHubRepositoryReport {
  projectId: string;
  appName: string;
  repoName: string | null;
  repoUrl: string | null;
  pushStatus: 'COMPLETED' | 'GITHUB_SETUP_REQUIRED' | 'FAILED';
  commitSha: string | null;
  filesPushedCount: number;
  authenticationStatus: 'AUTHENTICATED' | 'MISSING_TOKEN';
  requiresSetup: boolean;
  setupRequiredMessage: string | null;
  errors: string[];
  generatedAt: string;
}

export interface IGitHubProvider {
  isConfigured(): boolean;
  getAuthenticatedUser(): Promise<string>;
  createOrGetRepository(options: GitHubRepoOptions): Promise<GitHubRepoResult>;
  pushWebDirectory(webDir: string, repoUrl: string): Promise<{ commitSha: string; filesCount: number }>;
}
