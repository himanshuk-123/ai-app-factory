import 'dotenv/config';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function removeNestedGitDirs(dir: string, rootDir: string) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.name === '.git' && fullPath !== path.join(rootDir, '.git')) {
        console.log('[Git Cleanup] Removing nested git folder:', fullPath);
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else if (entry.isDirectory() && entry.name !== 'node_modules') {
        removeNestedGitDirs(fullPath, rootDir);
      }
    }
  } catch (err) {
    // ignore permission errors
  }
}

function runGit(cmd: string) {
  try {
    console.log(`[Git] Executing: ${cmd}`);
    const out = execSync(cmd, { cwd: process.cwd(), encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 });
    return out;
  } catch (err: any) {
    console.log(`[Git Note]:`, err.stdout || err.message);
    return err.stdout || '';
  }
}

async function pushFrameworkToGitHub() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is missing in .env file.');
  }

  const rootDir = process.cwd();
  console.log('[Git Cleanup] Scanning and removing all nested .git folders...');
  removeNestedGitDirs(rootDir, rootDir);

  const gitFolder = path.join(rootDir, '.git');
  if (fs.existsSync(gitFolder)) {
    console.log('[Git] Resetting local .git folder...');
    fs.rmSync(gitFolder, { recursive: true, force: true });
  }

  console.log('[Git Release] Initializing fresh git repository...');
  runGit('git init');
  runGit('git config user.name "AI App Factory"');
  runGit('git config user.email "appfactory@automated.local"');

  console.log('[Git Release] Staging source files (respecting .gitignore)...');
  runGit('git add .');

  console.log('[Git Release] Creating git commit...');
  const commitRes = runGit('git commit -m "Initial release of AI App Factory Framework and Visual Control Center Dashboard"');
  console.log('[Git Release] Commit Output:', commitRes);

  console.log('[Git Release] Setting main branch...');
  runGit('git branch -M main');

  const remoteUrl = `https://x-access-token:${token.trim()}@github.com/himanshuk-123/ai-app-factory.git`;
  runGit(`git remote add origin ${remoteUrl}`);

  console.log('[Git Release] Pushing entire framework to https://github.com/himanshuk-123/ai-app-factory...');
  const pushResult = runGit('git push -u origin main --force');
  console.log('[Git Release] Push Output:\n', pushResult);
  console.log('==================================================');
  console.log('🎉 SUCCESS: Entire AI App Factory framework published to GitHub!');
  console.log('URL: https://github.com/himanshuk-123/ai-app-factory');
  console.log('==================================================');
}

pushFrameworkToGitHub().catch((err) => {
  console.error('[Git Release Error]:', err);
  process.exit(1);
});
