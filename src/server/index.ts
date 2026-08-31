import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { URL } from 'node:url';
import { Orchestrator } from '../orchestrator/orchestrator.js';
import { factoryEvents } from '../orchestrator/event-emitter.js';
import { defaultAIGateway, globalUsageTracker } from '../infrastructure/ai/index.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const orchestrator = new Orchestrator();

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Create Node.js HTTP Server
const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url || '/', `http://${req.headers.host}`);
  const pathname = reqUrl.pathname;
  const method = req.method || 'GET';

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // ----------------------------------------------------
    // AI API Route: GET /api/ai/usage
    // ----------------------------------------------------
    if (pathname === '/api/ai/usage' && method === 'GET') {
      const summary = globalUsageTracker.getUsageSummary();
      const quotaState = defaultAIGateway.quotaManager.getQuotaState();
      summary.activeRpm = quotaState.activeRpm;
      summary.activeTpm = quotaState.activeTpm;
      summary.status = quotaState.status;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(summary));
      return;
    }

    // ----------------------------------------------------
    // AI API Route: GET /api/ai/history
    // ----------------------------------------------------
    if (pathname === '/api/ai/history' && method === 'GET') {
      const agent = reqUrl.searchParams.get('agent') || undefined;
      const model = reqUrl.searchParams.get('model') || undefined;
      const status = reqUrl.searchParams.get('status') || undefined;
      const projectId = reqUrl.searchParams.get('projectId') || undefined;

      const history = globalUsageTracker.getHistory({ agent, model, status, projectId });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(history));
      return;
    }

    // ----------------------------------------------------
    // AI API Route: GET /api/ai/config & POST /api/ai/config
    // ----------------------------------------------------
    if (pathname === '/api/ai/config') {
      if (method === 'GET') {
        const config = defaultAIGateway.modelRouter.getConfig();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(config));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const updates = JSON.parse(body || '{}');
            defaultAIGateway.modelRouter.updateConfig(updates);
            defaultAIGateway.quotaManager.updateQuotaConfig({
              rpm: updates.rpmLimit,
              inputTpm: updates.tpmLimit,
              rpd: updates.rpdLimit,
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, config: defaultAIGateway.modelRouter.getConfig() }));
          } catch (err: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }
    }

    // ----------------------------------------------------
    // API Route: GET /api/projects
    // ----------------------------------------------------
    if (pathname === '/api/projects' && method === 'GET') {
      const projectsDir = path.resolve(process.cwd(), 'projects');
      let projectFolders: string[] = [];
      try {
        const entries = await fs.readdir(projectsDir, { withFileTypes: true });
        projectFolders = entries.filter((e) => e.isDirectory()).map((e) => e.name);
      } catch {
        projectFolders = [];
      }

      const projectsList = [];
      for (const pId of projectFolders) {
        try {
          const stateFile = path.join(projectsDir, pId, 'project.json');
          const data = await fs.readFile(stateFile, 'utf-8');
          projectsList.push(JSON.parse(data));
        } catch {
          // ignore corrupted/empty project folders
        }
      }

      // Sort newest first
      projectsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(projectsList));
      return;
    }

    // ----------------------------------------------------
    // API Route: POST /api/projects
    // ----------------------------------------------------
    if (pathname === '/api/projects' && method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const idea = payload.idea || 'Build a student expense tracking app';

          // Launch orchestrator in background
          orchestrator
            .createProject(idea)
            .catch((err) => console.error('[Server] Orchestrator project build error:', err));

          res.writeHead(202, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'App Factory project pipeline initialized' }));
        } catch (err: any) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // ----------------------------------------------------
    // API Route: GET /api/projects/:id
    // ----------------------------------------------------
    const projectMatch = pathname.match(/^\/api\/projects\/([^\/]+)$/);
    if (projectMatch && method === 'GET') {
      const projectId = projectMatch[1];
      const projectFolder = path.resolve(process.cwd(), 'projects', projectId);

      try {
        const stateFile = path.join(projectFolder, 'project.json');
        const stateData = JSON.parse(await fs.readFile(stateFile, 'utf-8'));

        // Attempt loading optional report artifacts
        const reportFiles = [
          'idea-validation.json',
          'market-research.json',
          'product-spec.json',
          'ux-spec.json',
          'stitch-design.json',
          'build-debug-report.json',
          'apk-build-report.json',
          'android-qa-report.json',
          'visual-qa-report.json',
          'visual-auto-fix-report.json',
          'web-qa-report.json',
          'github-repository-report.json',
          'render-deployment-report.json',
        ];

        const reports: Record<string, any> = {};
        for (const rf of reportFiles) {
          try {
            const rfPath = path.join(projectFolder, rf);
            const content = await fs.readFile(rfPath, 'utf-8');
            reports[rf] = JSON.parse(content);
          } catch {
            reports[rf] = null;
          }
        }

        const events = await factoryEvents.getProjectEvents(projectId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            metadata: stateData,
            reports,
            events,
          })
        );
      } catch (err: any) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Project "${projectId}" not found.` }));
      }
      return;
    }

    // ----------------------------------------------------
    // API Route: GET /api/projects/:id/artifacts/:filename
    // ----------------------------------------------------
    const artifactMatch = pathname.match(/^\/api\/projects\/([^\/]+)\/artifacts\/([^\/]+)$/);
    if (artifactMatch && method === 'GET') {
      const projectId = artifactMatch[1];
      const filename = artifactMatch[2];
      const artifactPath = path.resolve(process.cwd(), 'projects', projectId, filename);

      try {
        const data = await fs.readFile(artifactPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
      } catch {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Artifact "${filename}" not found.` }));
      }
      return;
    }

    // ----------------------------------------------------
    // API Route: GET /api/projects/:id/screenshots/:filename
    // ----------------------------------------------------
    const screenshotMatch = pathname.match(/^\/api\/projects\/([^\/]+)\/screenshots\/([^\/]+)$/);
    if (screenshotMatch && method === 'GET') {
      const projectId = screenshotMatch[1];
      const filename = screenshotMatch[2];
      const imgPath = path.resolve(process.cwd(), 'projects', projectId, 'qa', 'screenshots', filename);

      try {
        const buffer = await fs.readFile(imgPath);
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(buffer);
      } catch {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Screenshot "${filename}" not found.` }));
      }
      return;
    }

    // ----------------------------------------------------
    // API Route: GET /api/projects/:id/events (Server-Sent Events Stream)
    // ----------------------------------------------------
    const sseMatch = pathname.match(/^\/api\/projects\/([^\/]+)\/events$/);
    if (sseMatch && method === 'GET') {
      const projectId = sseMatch[1];

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      // Send existing history first
      const pastEvents = await factoryEvents.getProjectEvents(projectId);
      for (const evt of pastEvents) {
        res.write(`data: ${JSON.stringify(evt)}\n\n`);
      }

      // Listen for future events
      const eventListener = (evt: any) => {
        res.write(`data: ${JSON.stringify(evt)}\n\n`);
      };

      factoryEvents.on(`event:${projectId}`, eventListener);

      req.on('close', () => {
        factoryEvents.off(`event:${projectId}`, eventListener);
      });
      return;
    }

    // ----------------------------------------------------
    // Static Dashboard Asset Serving (dashboard/dist)
    // ----------------------------------------------------
    const distDir = path.resolve(process.cwd(), 'dashboard', 'dist');
    let filePath = path.join(distDir, pathname === '/' ? 'index.html' : pathname);

    try {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      const ext = path.extname(filePath);
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      const content = await fs.readFile(filePath);

      res.writeHead(200, { 'Content-Type': mime });
      res.end(content);
      return;
    } catch {
      // Fallback for SPA routing to index.html if file exists in dashboard/dist
      try {
        const indexHtml = await fs.readFile(path.join(distDir, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexHtml);
        return;
      } catch {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            message: 'AI App Factory Server is running. Dashboard frontend not yet built (run "npm run build" in dashboard/).',
            projectsEndpoint: '/api/projects',
          })
        );
      }
    }
  } catch (err: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[Server Error] Port ${PORT} is already in use by another instance or process.`);
    console.error(`Please stop the running process or use "PORT=3002 npm run server"\n`);
  } else {
    console.error(`[Server Error]`, err);
  }
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(`🚀 AI App Factory Dashboard Server running on http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});
