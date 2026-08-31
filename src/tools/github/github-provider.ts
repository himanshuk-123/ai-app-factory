import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { IGitHubProvider, GitHubRepoOptions, GitHubRepoResult } from './types.js';

const execAsync = promisify(exec);

export class GitHubProvider implements IGitHubProvider {
  private token: string | null = null;
  private baseUrl = 'https://api.github.com';

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN || null;
  }

  public isConfigured(): boolean {
    return !!this.token && this.token.trim().length > 0;
  }

  private redactSecrets(text: string): string {
    if (!text) return text;
    let redacted = text;
    const secrets = [
      this.token,
      process.env.GITHUB_TOKEN,
      process.env.RENDER_API_KEY,
      process.env.GEMINI_API_KEY,
      process.env.EXPO_TOKEN,
    ].filter((s): s is string => !!s && s.length > 5);

    for (const secret of secrets) {
      redacted = redacted.split(secret).join('[REDACTED_SECRET]');
    }
    return redacted;
  }

  private getHeaders(): Record<string, string> {
    if (!this.token) {
      throw new Error('GITHUB_TOKEN is not configured in process environment.');
    }
    return {
      Authorization: `Bearer ${this.token.trim()}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'AI-App-Factory',
    };
  }

  /**
   * Retrieves the username of the authenticated GitHub user.
   */
  public async getAuthenticatedUser(): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('GitHub Token missing.');
    }

    const res = await fetch(`${this.baseUrl}/user`, {
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to authenticate GitHub user (HTTP ${res.status}): ${errText}`);
    }

    const userData = (await res.json()) as { login: string };
    return userData.login;
  }

  /**
   * Creates or retrieves a GitHub repository.
   */
  public async createOrGetRepository(options: GitHubRepoOptions): Promise<GitHubRepoResult> {
    if (!this.isConfigured()) {
      return {
        repoName: options.repoName,
        repoUrl: '',
        cloneUrl: '',
        status: 'GITHUB_SETUP_REQUIRED',
        requiresSetup: true,
        setupRequiredMessage:
          'GITHUB_TOKEN environment variable is not configured. Please generate a GitHub Personal Access Token (repo scope) from https://github.com/settings/tokens and set GITHUB_TOKEN=<your-token> in your .env file.',
      };
    }

    try {
      const username = await this.getAuthenticatedUser();
      const repoName = options.repoName;

      // 1. Check if repository already exists
      const checkRes = await fetch(`${this.baseUrl}/repos/${username}/${repoName}`, {
        headers: this.getHeaders(),
      });

      if (checkRes.ok) {
        const repoData = (await checkRes.json()) as { html_url: string; clone_url: string };
        console.log(`[GitHubProvider] Repository "${username}/${repoName}" already exists on GitHub.`);
        return {
          repoName,
          repoUrl: repoData.html_url,
          cloneUrl: repoData.clone_url,
          status: 'COMPLETED',
          requiresSetup: false,
        };
      }

      // 2. Create repository via GitHub REST API
      console.log(`[GitHubProvider] Creating GitHub repository "${username}/${repoName}"...`);
      const createRes = await fetch(`${this.baseUrl}/user/repos`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          name: repoName,
          description: options.description || 'Automated Web Application created by AI App Factory',
          private: options.isPrivate ?? false,
          auto_init: false,
        }),
      });

      if (!createRes.ok) {
        const createErr = await createRes.text();
        throw new Error(`Failed to create GitHub repository (HTTP ${createRes.status}): ${createErr}`);
      }

      const newRepo = (await createRes.json()) as { html_url: string; clone_url: string };
      console.log(`[GitHubProvider] Successfully created repository: ${newRepo.html_url}`);

      return {
        repoName,
        repoUrl: newRepo.html_url,
        cloneUrl: newRepo.clone_url,
        status: 'COMPLETED',
        requiresSetup: false,
      };
    } catch (err: any) {
      const errorMsg = this.redactSecrets(err.message);
      if (errorMsg.includes('403') || errorMsg.includes('Resource not accessible')) {
        return {
          repoName: options.repoName,
          repoUrl: '',
          cloneUrl: '',
          status: 'GITHUB_SETUP_REQUIRED',
          requiresSetup: true,
          setupRequiredMessage:
            'GitHub Fine-Grained Token authenticated successfully, but lacks repository creation permissions. Please update your token at https://github.com/settings/tokens to enable "Repository permissions -> Administration: Read and write" & "Contents: Read and write", or use a classic Personal Access Token with "repo" scope.',
          error: errorMsg,
        };
      }
      return {
        repoName: options.repoName,
        repoUrl: '',
        cloneUrl: '',
        status: 'FAILED',
        requiresSetup: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Initializes git, excludes sensitive files via .gitignore, commits, and pushes code to GitHub.
   */
  public async pushWebDirectory(webDir: string, repoUrl: string): Promise<{ commitSha: string; filesCount: number }> {
    if (!this.isConfigured()) {
      throw new Error('GitHub Token missing.');
    }

    try {
      // 1. Ensure .gitignore excludes secrets and build caches
      const gitignorePath = path.join(webDir, '.gitignore');
      const gitignoreContent = `# Dependency directories
node_modules/
jspm_packages/

# Production build output
dist/
build/

# Environment and Secret files
.env
.env.local
.env.*.local
*.pem
*.key

# Log files
*.log
npm-debug.log*

# Caches
.cache/
.vite/
.expo/
`;
      await fs.writeFile(gitignorePath, gitignoreContent, 'utf-8');

      // 2. Git setup & commit
      await execAsync('git init', { cwd: webDir });
      await execAsync('git config user.name "AI App Factory"', { cwd: webDir });
      await execAsync('git config user.email "appfactory@automated.local"', { cwd: webDir });
      await execAsync('git add .', { cwd: webDir });

      let commitSha = '';
      try {
        await execAsync('git commit -m "Automated AI App Factory release"', { cwd: webDir });
      } catch {
        console.log(`[GitHubProvider] No changes to commit or commit already exists.`);
      }

      const shaOut = await execAsync('git rev-parse HEAD', { cwd: webDir });
      commitSha = shaOut.stdout.trim();

      // Count files committed/tracked
      const lsOut = await execAsync('git ls-files', { cwd: webDir });
      const filesCount = lsOut.stdout.split('\n').filter((f) => f.trim().length > 0).length;

      // 3. Configure remote with authenticated token
      const username = await this.getAuthenticatedUser();
      const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
      const authRemoteUrl = `https://x-access-token:${this.token!.trim()}@github.com/${username}/${repoName}.git`;

      try {
        await execAsync(`git remote remove origin`, { cwd: webDir });
      } catch {
        // remote origin did not exist yet
      }

      await execAsync(`git remote add origin ${authRemoteUrl}`, { cwd: webDir });
      await execAsync(`git branch -M main`, { cwd: webDir });

      console.log(`[GitHubProvider] Pushing web project source code to GitHub repository...`);
      await execAsync(`git push -u origin main --force`, { cwd: webDir });
      console.log(`[GitHubProvider] Successfully pushed ${filesCount} files to GitHub repository.`);

      return {
        commitSha,
        filesCount,
      };
    } catch (err: any) {
      const msg = this.redactSecrets(err.stdout || err.stderr || err.message);
      throw new Error(`Git push error: ${msg}`);
    }
  }
}
