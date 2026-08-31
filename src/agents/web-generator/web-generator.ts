import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { ProjectStateManager } from '../../orchestrator/project-state.js';
import type { IdeaValidationResult } from '../idea-validator/types.js';
import type { ProductSpecResult } from '../product-strategist/types.js';
import type { UXSpecResult, ScreenUXSpec } from '../ux-architect/types.js';
import type { StitchDesignResult } from '../stitch-designer/types.js';
import type { WebGeneratorResult } from './types.js';

const execAsync = promisify(exec);

export class WebGeneratorAgent {
  async generateWeb(
    projectId: string,
    idea: string,
    projectFolderPath: string,
    stateManager: ProjectStateManager,
    validationResult?: IdeaValidationResult,
    specResult?: ProductSpecResult | null,
    uxResult?: UXSpecResult | null,
    stitchResult?: StitchDesignResult | null
  ): Promise<WebGeneratorResult | null> {
    if (validationResult?.recommendation === 'REJECT') {
      console.log(`[WebGeneratorAgent] Skipping Web Generation because Idea Validation recommendation is "REJECT".`);
      await stateManager?.updateState({
        webGenerationSkipped: true,
        skipReason: 'Idea Validation rejected the product idea.',
      });
      return null;
    }

    console.log(`[WebGeneratorAgent] Starting React Web Application generation for project "${projectId}"...`);
    await stateManager?.updateStatus('IN_PROGRESS');
    await stateManager?.updateStage('WEB_GENERATION');

    // Load specs from files if not passed directly
    let productData = specResult;
    if (!productData) {
      try {
        const content = await fs.readFile(path.join(projectFolderPath, 'product-spec.json'), 'utf-8');
        productData = JSON.parse(content);
      } catch {
        console.warn(`[WebGeneratorAgent] product-spec.json not found on disk.`);
      }
    }

    let uxData = uxResult;
    if (!uxData) {
      try {
        const content = await fs.readFile(path.join(projectFolderPath, 'ux-spec.json'), 'utf-8');
        uxData = JSON.parse(content);
      } catch {
        console.warn(`[WebGeneratorAgent] ux-spec.json not found on disk.`);
      }
    }

    let stitchData = stitchResult;
    if (!stitchData) {
      try {
        const content = await fs.readFile(path.join(projectFolderPath, 'stitch-design.json'), 'utf-8');
        stitchData = JSON.parse(content);
      } catch {
        console.warn(`[WebGeneratorAgent] stitch-design.json not found on disk.`);
      }
    }

    const appName = productData?.appName || uxData?.appName || 'AppFactory App';
    const appDescription = productData?.oneLineDescription || 'AI Generated React Application';
    const screens: ScreenUXSpec[] =
      uxData?.screens && uxData.screens.length > 0
        ? uxData.screens
        : [
            {
              screenId: 'screen_dashboard',
              screenName: 'Dashboard',
              purpose: 'Main App Dashboard',
              userGoal: 'Overview and primary features',
              entryPoints: ['Launch'],
              exitActions: [],
              layoutStructure: 'Hero Header + Metric Cards + Action List',
              uiComponents: ['Hero Card', 'Action Button', 'Metric Display'],
              componentInteractions: [],
              requiredData: ['userProfile', 'metrics'],
              loadingState: 'Pulse Skeletons',
              emptyState: 'No data yet. Get started by clicking add.',
              errorState: 'Failed to load dashboard data. Retrying...',
              successState: 'Data updated successfully.',
              mobileConsiderations: 'Touch-optimized mobile layout',
            },
          ];

    const webDir = path.join(projectFolderPath, 'web');
    await fs.mkdir(webDir, { recursive: true });
    await fs.mkdir(path.join(webDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(webDir, 'src', 'components'), { recursive: true });
    await fs.mkdir(path.join(webDir, 'src', 'screens'), { recursive: true });
    await fs.mkdir(path.join(webDir, 'src', 'types'), { recursive: true });

    // 1. Write package.json
    const packageJson = {
      name: appName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      private: true,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc && vite build',
        preview: 'vite preview',
      },
      dependencies: {
        react: '^18.3.1',
        'react-dom': '^18.3.1',
        'lucide-react': '^0.378.0',
      },
      devDependencies: {
        '@types/react': '^18.3.3',
        '@types/react-dom': '^18.3.0',
        '@vitejs/plugin-react': '^4.3.0',
        typescript: '^5.4.5',
        vite: '^5.2.11',
      },
    };
    await fs.writeFile(path.join(webDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // 2. Write tsconfig.json
    const tsconfigJson = {
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: false,
        noUnusedParameters: false,
        noFallthroughCasesInSwitch: true,
      },
      include: ['src'],
    };
    await fs.writeFile(path.join(webDir, 'tsconfig.json'), JSON.stringify(tsconfigJson, null, 2));

    // 3. Write vite.config.ts
    const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;
    await fs.writeFile(path.join(webDir, 'vite.config.ts'), viteConfig);

    // Extract Stitch design system theme tokens dynamically
    const firstScreenTheme = stitchData?.screens?.find((s: any) => s.theme && Object.keys(s.theme).length > 0)?.theme;

    const primaryColor =
      firstScreenTheme?.overrideSecondaryColor ||
      firstScreenTheme?.namedColors?.secondary ||
      firstScreenTheme?.namedColors?.secondary_fixed ||
      firstScreenTheme?.overrideTertiaryColor ||
      firstScreenTheme?.namedColors?.primary ||
      (firstScreenTheme?.customColor && firstScreenTheme.customColor !== '#0b0b0e' ? firstScreenTheme.customColor : null) ||
      '#38bdf8';

    const bgMain =
      firstScreenTheme?.namedColors?.background ||
      firstScreenTheme?.namedColors?.surface ||
      firstScreenTheme?.overrideNeutralColor ||
      (firstScreenTheme?.colorMode === 'LIGHT' ? '#fbf9f8' : '#0f172a');

    const bgCard =
      firstScreenTheme?.namedColors?.surface_container ||
      firstScreenTheme?.namedColors?.surface_container_low ||
      (firstScreenTheme?.colorMode === 'LIGHT' ? '#ffffff' : '#1e293b');

    const textMain =
      firstScreenTheme?.namedColors?.on_background ||
      firstScreenTheme?.namedColors?.on_surface ||
      (firstScreenTheme?.colorMode === 'LIGHT' ? '#1b1c1c' : '#f8fafc');

    const textMuted =
      firstScreenTheme?.namedColors?.on_surface_variant ||
      firstScreenTheme?.namedColors?.outline ||
      (firstScreenTheme?.colorMode === 'LIGHT' ? '#5a4136' : '#94a3b8');

    const borderColor =
      firstScreenTheme?.namedColors?.outline_variant ||
      firstScreenTheme?.namedColors?.outline ||
      (firstScreenTheme?.colorMode === 'LIGHT' ? '#e2bfb0' : '#334155');

    const rawFont =
      firstScreenTheme?.headlineFontFamily ||
      firstScreenTheme?.bodyFontFamily ||
      firstScreenTheme?.font ||
      'Inter';
    const fontFamily = rawFont.replace(/_/g, ' ');
    const googleFontName = fontFamily.replace(/\s+/g, '+');

    // 4. Write index.html
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${appName} - ${appDescription}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=${googleFontName}:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
    await fs.writeFile(path.join(webDir, 'index.html'), indexHtml);

    // 5. Write src/index.css
    const indexCss = `/* Design System & Visual Foundation generated from Stitch Design System */
:root {
  --font-family: '${fontFamily}', 'Inter', system-ui, -apple-system, sans-serif;
  --bg-main: ${bgMain};
  --bg-card: ${bgCard};
  --bg-card-hover: ${borderColor};
  --primary: ${primaryColor};
  --primary-hover: ${primaryColor};
  --accent: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --text-main: ${textMain};
  --text-muted: ${textMuted};
  --border-color: ${borderColor};
  --radius: 12px;
  --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-family);
  background-color: var(--bg-main);
  color: var(--text-main);
  min-height: 100vh;
  line-height: 1.6;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  margin-bottom: 24px;
  box-shadow: var(--shadow);
}

.header-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--primary);
}

.header-subtitle {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.nav-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.nav-item {
  padding: 10px 18px;
  border-radius: var(--radius);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.nav-item:hover {
  background: var(--bg-card-hover);
  color: var(--text-main);
}

.nav-item.active {
  background: var(--primary);
  color: #0f172a;
  font-weight: 700;
  border-color: var(--primary);
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: var(--shadow);
}

.card-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--text-main);
}

.card-desc {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-bottom: 16px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius);
  font-size: 0.95rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--primary);
  color: #0f172a;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-secondary {
  background: var(--bg-card-hover);
  color: var(--text-main);
  border: 1px solid var(--border-color);
}

.state-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.state-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-muted);
  cursor: pointer;
}

.state-btn.active {
  background: var(--accent);
  color: #0f172a;
  font-weight: 700;
}

.state-banner {
  padding: 12px 16px;
  border-radius: var(--radius);
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.state-banner.loading {
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid var(--primary);
  color: var(--primary);
  animation: pulse 1.5s infinite;
}

.state-banner.empty {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid var(--warning);
  color: var(--warning);
}

.state-banner.error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid var(--danger);
  color: var(--danger);
}

.state-banner.success {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid var(--accent);
  color: var(--accent);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.footer {
  margin-top: auto;
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
  font-size: 0.85rem;
  border-top: 1px solid var(--border-color);
}
`;
    await fs.writeFile(path.join(webDir, 'src', 'index.css'), indexCss);

    // 6. Write src/types/index.ts
    const typesTs = `export interface ScreenData {
  screenId: string;
  screenName: string;
  purpose: string;
  userGoal: string;
  layoutStructure: string;
  uiComponents: string[];
  loadingState: string;
  emptyState: string;
  errorState: string;
  successState: string;
}

export type ViewState = 'NORMAL' | 'LOADING' | 'EMPTY' | 'ERROR' | 'SUCCESS';
`;
    await fs.writeFile(path.join(webDir, 'src', 'types', 'index.ts'), typesTs);

    // 7. Write components
    const headerComponent = `import React from 'react';

interface HeaderProps {
  appName: string;
  tagline: string;
}

export const Header: React.FC<HeaderProps> = ({ appName, tagline }) => {
  return (
    <header className="header">
      <div>
        <h1 className="header-title">{appName}</h1>
        <p className="header-subtitle">{tagline}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--accent)', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--accent)' }}>
          ● Live App
        </span>
      </div>
    </header>
  );
};
`;
    await fs.writeFile(path.join(webDir, 'src', 'components', 'Header.tsx'), headerComponent);

    const navComponent = `import React from 'react';

interface NavItem {
  id: string;
  label: string;
}

interface NavigationProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ items, activeId, onSelect }) => {
  return (
    <nav className="nav-bar">
      {items.map((item) => (
        <button
          key={item.id}
          className={\`nav-item \${activeId === item.id ? 'active' : ''}\`}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
};
`;
    await fs.writeFile(path.join(webDir, 'src', 'components', 'Navigation.tsx'), navComponent);

    // 8. Generate screen components dynamically for every screen in ux-spec.json
    const generatedScreenNames: string[] = [];
    for (const s of screens) {
      const screenId = s.screenId || 'screen_main';
      const screenName = s.screenName || 'Screen';
      const componentName = screenId
        .replace(/^screen_/, '')
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('') + 'Screen';

      generatedScreenNames.push(componentName);

      const screenCode = `import React, { useState } from 'react';
import { ViewState } from '../types';

export const ${componentName}: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('NORMAL');

  return (
    <div className="card">
      <div className="card-title">{${JSON.stringify(screenName)}}</div>
      <p className="card-desc">{${JSON.stringify(s.purpose || 'Screen details and functionality.')}}</p>

      {/* UX State Simulation Controls */}
      <div style={{ marginBottom: '16px' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '8px' }}>Test UX States:</span>
        <div className="state-controls" style={{ display: 'inline-flex' }}>
          {(['NORMAL', 'LOADING', 'EMPTY', 'ERROR', 'SUCCESS'] as ViewState[]).map((st) => (
            <button
              key={st}
              className={\`state-btn \${viewState === st ? 'active' : ''}\`}
              onClick={() => setViewState(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* UX State Displays */}
      {viewState === 'LOADING' && (
        <div className="state-banner loading">
          ⏳ {${JSON.stringify(s.loadingState || 'Loading screen resources...')}}
        </div>
      )}

      {viewState === 'EMPTY' && (
        <div className="state-banner empty">
          📭 {${JSON.stringify(s.emptyState || 'No records found.')}}
        </div>
      )}

      {viewState === 'ERROR' && (
        <div className="state-banner error">
          ⚠️ {${JSON.stringify(s.errorState || 'Error loading screen data.')}}
        </div>
      )}

      {viewState === 'SUCCESS' && (
        <div className="state-banner success">
          ✅ {${JSON.stringify(s.successState || 'Action completed successfully!')}}
        </div>
      )}

      {/* Normal Main UI with Real Interactive Feature Components */}
      {viewState === 'NORMAL' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Hero Card */}
          <div style={{ background: 'var(--bg-main)', padding: '20px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)' }}>
                Active Goal & Plan
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '4px', color: 'var(--text-main)' }}>
                {${JSON.stringify(s.userGoal || 'Streamlined user workflow and features.')}}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Architecture: {${JSON.stringify(s.layoutStructure || 'Responsive Layout Grid')}}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>85%</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status Score</span>
            </div>
          </div>

          {/* Interactive Domain-Rich Feature Cards */}
          <div className="grid-2">
            {${JSON.stringify(s.uiComponents)}.map((comp, idx) => {
              const compLower = comp.toLowerCase();
              const isBooking = compLower.includes('booking') || compLower.includes('slot') || compLower.includes('calendar') || compLower.includes('schedule') || compLower.includes('time');
              const isService = compLower.includes('service') || compLower.includes('menu') || compLower.includes('haircut') || compLower.includes('price') || compLower.includes('package');
              const isSpecialist = compLower.includes('barber') || compLower.includes('stylist') || compLower.includes('staff') || compLower.includes('specialist') || compLower.includes('team');
              const isChart = compLower.includes('chart') || compLower.includes('analytics') || compLower.includes('heatmap') || compLower.includes('streak');
              const isMetric = compLower.includes('card') || compLower.includes('hero') || compLower.includes('score') || compLower.includes('gauge') || compLower.includes('status');

              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: 'var(--shadow)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {comp}
                    </h4>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--bg-card-hover)', color: 'var(--primary)', fontWeight: 600 }}>
                      Live Feature
                    </span>
                  </div>

                  {isService ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { title: 'Classic Haircut & Styling', price: '$35', time: '30 mins' },
                        { title: 'Beard Trim & Hot Towel Shave', price: '$25', time: '20 mins' },
                        { title: 'Executive Grooming Package', price: '$55', time: '50 mins' },
                      ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{item.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>⏱ {item.time}</div>
                          </div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>{item.price}</div>
                        </div>
                      ))}
                    </div>
                  ) : isSpecialist ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { name: 'Alex Rivera', role: 'Master Barber', rating: '4.9 ★ (120 reviews)' },
                        { name: 'Marcus Chen', role: 'Fade & Styling Specialist', rating: '4.8 ★ (94 reviews)' },
                      ].map((barber, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#0f172a' }}>
                            {barber.name.charAt(0)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{barber.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{barber.role} • {barber.rating}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : isBooking ? (
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Select Available Time Slot:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                        {['09:00 AM', '10:30 AM', '01:15 PM', '03:45 PM', '05:00 PM'].map((slot, i) => (
                          <span key={i} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', background: i === 1 ? 'var(--primary)' : 'var(--bg-card-hover)', color: i === 1 ? '#0f172a' : 'var(--text-main)', fontWeight: i === 1 ? 700 : 500, cursor: 'pointer' }}>
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : isChart ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '60px', marginTop: '8px', marginBottom: '8px' }}>
                        {[40, 65, 30, 85, 95, 60, 75].map((h, i) => (
                          <div key={i} style={{ flex: 1, background: i === 4 ? 'var(--primary)' : 'var(--bg-card-hover)', height: \`\${h}%\`, borderRadius: '4px' }} />
                        ))}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Real-Time Activity Trends</span>
                    </div>
                  ) : isMetric ? (
                    <div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', margin: '4px 0' }}>
                        {idx % 2 === 0 ? '98% Positive Feedback' : '$45 Average Ticket'}
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'var(--bg-card-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: idx % 2 === 0 ? '98%' : '75%', height: '100%', background: 'var(--primary)' }} />
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Interactive module with live state management and dynamic UI response.
                    </p>
                  )}

                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }} onClick={() => setViewState('SUCCESS')}>
                    ⚡ Select & Continue
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
`;
      await fs.writeFile(path.join(webDir, 'src', 'screens', `${componentName}.tsx`), screenCode);
    }

    // 9. Write src/App.tsx
    const imports = generatedScreenNames
      .map((name) => `import { ${name} } from './screens/${name}';`)
      .join('\n');

    const screenMap = generatedScreenNames
      .map((name, idx) => `  '${screens[idx].screenId}': <${name} />`)
      .join(',\n');

    const navItems = screens
      .map((s) => `{ id: '${s.screenId}', label: ${JSON.stringify(s.screenName)} }`)
      .join(',\n    ');

    const appTsx = `import React, { useState } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
${imports}

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<string>('${screens[0].screenId}');

  const navItems = [
    ${navItems}
  ];

  const screensMap: Record<string, React.ReactNode> = {
  ${screenMap}
  };

  return (
    <div className="app-container">
      <Header
        appName="${appName}"
        tagline="${appDescription}"
      />

      <Navigation
        items={navItems}
        activeId={activeScreen}
        onSelect={(id) => setActiveScreen(id)}
      />

      <main>
        {screensMap[activeScreen] || <div>Screen not found.</div>}
      </main>

      <footer className="footer">
        <p>AI App Factory Generated Project • ${appName} • React + TypeScript + Vite</p>
      </footer>
    </div>
  );
};

export default App;
`;
    await fs.writeFile(path.join(webDir, 'src', 'App.tsx'), appTsx);

    // 10. Write src/main.tsx
    const mainTsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
    await fs.writeFile(path.join(webDir, 'src', 'main.tsx'), mainTsx);

    // 11. Run npm install & npm run build validation inside projects/<projectId>/web/
    console.log(`[WebGeneratorAgent] Installing dependencies in "${webDir}"...`);
    let buildSuccess = false;
    let buildError: string | undefined;

    try {
      await execAsync('npm install', { cwd: webDir });
      console.log(`[WebGeneratorAgent] Dependencies installed successfully.`);

      console.log(`[WebGeneratorAgent] Building React TypeScript application...`);
      const { stdout, stderr } = await execAsync('npm run build', { cwd: webDir });
      console.log(`[WebGeneratorAgent] Build output:\n${stdout}`);
      if (stderr) {
        console.warn(`[WebGeneratorAgent] Build warnings:\n${stderr}`);
      }
      buildSuccess = true;
    } catch (err: any) {
      buildError = err.message || String(err);
      console.error(`[WebGeneratorAgent] Web application build failed:\n${buildError}`);
    }

    const webResult: WebGeneratorResult = {
      projectId,
      appName,
      webProjectPath: `projects/${projectId}/web`,
      screenCount: screens.length,
      generatedScreens: generatedScreenNames,
      buildSuccess,
      buildError,
      generatedAt: new Date().toISOString(),
    };

    // Save web-generator.json
    await fs.writeFile(
      path.join(projectFolderPath, 'web-generator.json'),
      JSON.stringify(webResult, null, 2),
      'utf-8'
    );

    // Update project.json state
    if (buildSuccess) {
      await stateManager?.updateStage('WEB_GENERATION_COMPLETED');
      await stateManager?.updateState({
        webGenerationComplete: true,
        webProjectPath: `projects/${projectId}/web`,
        webScreenCount: screens.length,
        webBuildSuccess: true,
      });
      console.log(`[WebGeneratorAgent] React Web Application generated and validated successfully at: ${webDir}`);
    } else {
      await stateManager?.updateStage('WEB_GENERATION_FAILED');
      await stateManager?.updateState({
        webGenerationComplete: false,
        webBuildSuccess: false,
        webBuildError: buildError,
      });
      throw new Error(`Web Application generation/build failed: ${buildError}`);
    }

    return webResult;
  }
}
