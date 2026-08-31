import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { ProjectStateManager } from '../../orchestrator/project-state.js';
import type { IdeaValidationResult } from '../idea-validator/types.js';
import type { ProductSpecResult } from '../product-strategist/types.js';
import type { UXSpecResult, ScreenUXSpec } from '../ux-architect/types.js';
import type { StitchDesignResult } from '../stitch-designer/types.js';
import type { MobileGeneratorResult } from './types.js';

const execAsync = promisify(exec);

export class MobileGeneratorAgent {
  async generateMobile(
    projectId: string,
    idea: string,
    projectFolderPath: string,
    stateManager: ProjectStateManager,
    validationResult?: IdeaValidationResult,
    specResult?: ProductSpecResult | null,
    uxResult?: UXSpecResult | null,
    stitchResult?: StitchDesignResult | null
  ): Promise<MobileGeneratorResult | null> {
    if (validationResult?.recommendation === 'REJECT') {
      console.log(`[MobileGeneratorAgent] Skipping Mobile Generation because Idea Validation recommendation is "REJECT".`);
      await stateManager.updateState({
        mobileGenerationSkipped: true,
        skipReason: 'Idea Validation rejected the product idea.',
      });
      return null;
    }

    console.log(`[MobileGeneratorAgent] Starting React Native (Expo) Application generation for project "${projectId}"...`);
    await stateManager.updateStatus('IN_PROGRESS');
    await stateManager.updateStage('MOBILE_GENERATION');

    // Load specs from files if not passed directly
    let productData = specResult;
    if (!productData) {
      try {
        const content = await fs.readFile(path.join(projectFolderPath, 'product-spec.json'), 'utf-8');
        productData = JSON.parse(content);
      } catch {
        console.warn(`[MobileGeneratorAgent] product-spec.json not found on disk.`);
      }
    }

    let uxData = uxResult;
    if (!uxData) {
      try {
        const content = await fs.readFile(path.join(projectFolderPath, 'ux-spec.json'), 'utf-8');
        uxData = JSON.parse(content);
      } catch {
        console.warn(`[MobileGeneratorAgent] ux-spec.json not found on disk.`);
      }
    }

    const appName = productData?.appName || uxData?.appName || 'ScholarSpend';
    const appDescription = productData?.oneLineDescription || 'AI Generated React Native Expo Application';
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

    const mobileDir = path.join(projectFolderPath, 'mobile');
    await fs.mkdir(mobileDir, { recursive: true });
    await fs.mkdir(path.join(mobileDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(mobileDir, 'src', 'theme'), { recursive: true });
    await fs.mkdir(path.join(mobileDir, 'src', 'components'), { recursive: true });
    await fs.mkdir(path.join(mobileDir, 'src', 'screens'), { recursive: true });
    await fs.mkdir(path.join(mobileDir, 'src', 'types'), { recursive: true });
    await fs.mkdir(path.join(mobileDir, 'src', 'navigation'), { recursive: true });

    const slug = appName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // 1. Write package.json
    const packageJson = {
      name: slug,
      version: '1.0.0',
      main: 'node_modules/expo/AppEntry.js',
      scripts: {
        start: 'expo start',
        android: 'expo start --android',
        ios: 'expo start --ios',
        web: 'expo start --web',
        'type-check': 'tsc --noEmit',
      },
      dependencies: {
        expo: '~51.0.0',
        'expo-status-bar': '~1.12.1',
        react: '18.2.0',
        'react-native': '0.74.5',
      },
      devDependencies: {
        '@babel/core': '^7.24.0',
        '@types/react': '~18.2.45',
        typescript: '~5.3.3',
      },
      private: true,
    };
    await fs.writeFile(path.join(mobileDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // 2. Write tsconfig.json
    const tsconfigJson = {
      compilerOptions: {
        target: 'esnext',
        module: 'esnext',
        lib: ['esnext'],
        allowJs: true,
        jsx: 'react-native',
        noEmit: true,
        isolatedModules: true,
        strict: true,
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
      include: ['src', 'App.tsx'],
    };
    await fs.writeFile(path.join(mobileDir, 'tsconfig.json'), JSON.stringify(tsconfigJson, null, 2));

    // 3. Write app.json (Expo Managed Config)
    const appJson = {
      expo: {
        name: appName,
        slug: slug,
        version: '1.0.0',
        orientation: 'portrait',
        userInterfaceStyle: 'dark',
        splash: {
          resizeMode: 'contain',
          backgroundColor: '#0f172a',
        },
        ios: {
          supportsTablet: true,
        },
        android: {
          adaptiveIcon: {
            backgroundColor: '#0f172a',
          },
        },
        web: {
          favicon: './assets/favicon.png',
        },
      },
    };
    await fs.writeFile(path.join(mobileDir, 'app.json'), JSON.stringify(appJson, null, 2));

    let stitchData = stitchResult;
    if (!stitchData) {
      try {
        const content = await fs.readFile(path.join(projectFolderPath, 'stitch-design.json'), 'utf-8');
        stitchData = JSON.parse(content);
      } catch {
        console.warn(`[MobileGeneratorAgent] stitch-design.json not found on disk.`);
      }
    }

    // Extract Stitch design system theme tokens dynamically
    const firstScreenTheme = stitchData?.screens?.find((s: any) => s.theme && Object.keys(s.theme).length > 0)?.theme;

    const primaryColor =
      firstScreenTheme?.customColor ||
      firstScreenTheme?.overridePrimaryColor ||
      firstScreenTheme?.namedColors?.primary_container ||
      firstScreenTheme?.namedColors?.primary ||
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

    // 4. Write src/theme/index.ts
    const themeTs = `export const Colors = {
  bgMain: '${bgMain}',
  bgCard: '${bgCard}',
  bgCardHover: '${borderColor}',
  primary: '${primaryColor}',
  primaryDark: '${primaryColor}',
  accent: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  textMain: '${textMain}',
  textMuted: '${textMuted}',
  borderColor: '${borderColor}',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
`;
    await fs.writeFile(path.join(mobileDir, 'src', 'theme', 'index.ts'), themeTs);

    // 5. Write src/types/index.ts
    const typesTs = `export type ViewState = 'NORMAL' | 'LOADING' | 'EMPTY' | 'ERROR' | 'SUCCESS';

export interface ScreenSpec {
  screenId: string;
  screenName: string;
  purpose: string;
  userGoal: string;
  layoutStructure: string;
  uiComponents: string[];
}
`;
    await fs.writeFile(path.join(mobileDir, 'src', 'types', 'index.ts'), typesTs);

    // 6. Write components
    const headerComponent = `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../theme';

interface HeaderProps {
  appName: string;
  tagline: string;
}

export const Header: React.FC<HeaderProps> = ({ appName, tagline }) => {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{appName}</Text>
        <Text style={styles.subtitle}>{tagline}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>● Mobile Expo</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  badge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: Colors.accent,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
});
`;
    await fs.writeFile(path.join(mobileDir, 'src', 'components', 'Header.tsx'), headerComponent);

    // 7. Generate screen components for every screen in ux-spec.json
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
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Colors, Spacing } from '../theme';
import { ViewState } from '../types';

export const ${componentName}: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('NORMAL');

  const states: ViewState[] = ['NORMAL', 'LOADING', 'EMPTY', 'ERROR', 'SUCCESS'];

  return (
    <ScrollView style={styles.card}>
      <Text style={styles.cardTitle}>{${JSON.stringify(screenName)}}</Text>
      <Text style={styles.cardDesc}>{${JSON.stringify(s.purpose || 'Screen purpose and goal.')}}</Text>

      {/* UX State Selector */}
      <Text style={styles.sectionLabel}>Test UX States:</Text>
      <View style={styles.stateRow}>
        {states.map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.stateBtn, viewState === st && styles.stateBtnActive]}
            onPress={() => setViewState(st)}
          >
            <Text style={[styles.stateBtnText, viewState === st && styles.stateBtnTextActive]}>
              {st}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* UX State View Outputs */}
      {viewState === 'LOADING' && (
        <View style={[styles.stateBanner, styles.loadingBanner]}>
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.loadingText}>⏳ {${JSON.stringify(s.loadingState || 'Loading screen data...')}}</Text>
        </View>
      )}

      {viewState === 'EMPTY' && (
        <View style={[styles.stateBanner, styles.emptyBanner]}>
          <Text style={styles.emptyText}>📭 {${JSON.stringify(s.emptyState || 'No items available.')}}</Text>
        </View>
      )}

      {viewState === 'ERROR' && (
        <View style={[styles.stateBanner, styles.errorBanner]}>
          <Text style={styles.errorText}>⚠️ {${JSON.stringify(s.errorState || 'Error loading screen data.')}}</Text>
        </View>
      )}

      {viewState === 'SUCCESS' && (
        <View style={[styles.stateBanner, styles.successBanner]}>
          <Text style={styles.successText}>✅ {${JSON.stringify(s.successState || 'Action executed successfully!')}}</Text>
        </View>
      )}

      {/* Normal Main Screen Content with Real Interactive Feature Components */}
      {viewState === 'NORMAL' && (
        <View style={{ gap: 12 }}>
          {/* Main Hero Card */}
          <View style={styles.infoBox}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: Colors.primary, textTransform: 'uppercase', marginBottom: 2 }}>
              Active Screen Goal
            </Text>
            <Text style={styles.infoTitle}>{${JSON.stringify(s.userGoal || 'User workflow and primary features.')}}</Text>
            <Text style={styles.infoContent}>Structure: {${JSON.stringify(s.layoutStructure || 'Mobile Card Layout')}}</Text>
          </View>

          {/* Interactive UI Component Cards */}
          {${JSON.stringify(s.uiComponents)}.map((comp, idx) => {
            const compLower = comp.toLowerCase();
            const isAction = compLower.includes('button') || compLower.includes('cta') || compLower.includes('action');
            const isChart = compLower.includes('chart') || compLower.includes('analytics') || compLower.includes('heatmap') || compLower.includes('streak');
            const isMetric = compLower.includes('card') || compLower.includes('hero') || compLower.includes('score') || compLower.includes('gauge');

            return (
              <View key={idx} style={[styles.infoBox, { backgroundColor: Colors.bgCard }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: Colors.textMain, flex: 1 }}>{comp}</Text>
                  <View style={styles.compBadge}>
                    <Text style={{ fontSize: 10, color: Colors.primary, fontWeight: 'bold' }}>Active</Text>
                  </View>
                </View>

                {isChart ? (
                  <View style={{ marginVertical: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 40, gap: 4 }}>
                      {[40, 65, 30, 85, 95, 60, 75].map((h, i) => (
                        <View key={i} style={{ flex: 1, backgroundColor: i === 4 ? Colors.primary : Colors.bgCardHover, height: \`\${h}%\`, borderRadius: 2 }} />
                      ))}
                    </View>
                    <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 4 }}>7-Day Trend Analysis</Text>
                  </View>
                ) : isMetric ? (
                  <View style={{ marginVertical: 6 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.primary }}>
                      {idx % 2 === 0 ? 'Optimal (92/100)' : '4 Active Items'}
                    </Text>
                    <View style={{ width: '100%', height: 4, backgroundColor: Colors.bgCardHover, borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                      <View style={{ width: idx % 2 === 0 ? '92%' : '65%', height: '100%', backgroundColor: Colors.primary }} />
                    </View>
                  </View>
                ) : (
                  <Text style={{ fontSize: 12, color: Colors.textMuted, marginVertical: 4 }}>
                    Interactive mobile component offering real-time touch interaction and status updates.
                  </Text>
                )}

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: isAction ? Colors.primary : Colors.bgCardHover, marginTop: 8 }]}
                  onPress={() => setViewState('SUCCESS')}
                >
                  <Text style={[styles.actionBtnText, { color: isAction ? '#0f172a' : Colors.textMain }]}>
                    {isAction ? \`⚡ \${comp}\` : 'View Details'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textMain,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  stateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.md,
  },
  stateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.bgMain,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  stateBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  stateBtnText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  stateBtnTextActive: {
    color: '#0f172a',
    fontWeight: 'bold',
  },
  stateBanner: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  loadingText: {
    color: Colors.primary,
    fontSize: 13,
  },
  emptyBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: Colors.warning,
    borderWidth: 1,
  },
  emptyText: {
    color: Colors.warning,
    fontSize: 13,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: Colors.danger,
    borderWidth: 1,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
  },
  successBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: Colors.accent,
    borderWidth: 1,
  },
  successText: {
    color: Colors.accent,
    fontSize: 13,
  },
  infoBox: {
    backgroundColor: Colors.bgMain,
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    marginBottom: Spacing.md,
  },
  infoTitle: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoContent: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.md,
  },
  compBadge: {
    backgroundColor: Colors.bgCardHover,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  compBadgeText: {
    color: Colors.textMain,
    fontSize: 12,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  actionBtnText: {
    color: '#0f172a',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
`;
      await fs.writeFile(path.join(mobileDir, 'src', 'screens', `${componentName}.tsx`), screenCode);
    }

    // 8. Write src/navigation/AppNavigator.tsx
    const navImports = generatedScreenNames
      .map((name) => `import { ${name} } from '../screens/${name}';`)
      .join('\n');

    const navTabs = screens
      .map((s, idx) => `{ id: '${s.screenId}', label: ${JSON.stringify(s.screenName)}, component: ${generatedScreenNames[idx]} }`)
      .join(',\n    ');

    const navCode = `import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Spacing } from '../theme';
${navImports}

export const AppNavigator: React.FC = () => {
  const tabs = [
    ${navTabs}
  ];

  const [activeTabId, setActiveTabId] = useState<string>('${screens[0].screenId}');

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const ActiveComponent = activeTab.component;

  return (
    <View style={styles.container}>
      {/* Mobile Screen Tab Navigation Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.navTab, activeTabId === tab.id && styles.navTabActive]}
            onPress={() => setActiveTabId(tab.id)}
          >
            <Text style={[styles.navTabText, activeTabId === tab.id && styles.navTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Render Active Mobile Screen */}
      <View style={styles.contentContainer}>
        <ActiveComponent />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    maxHeight: 50,
    marginBottom: Spacing.sm,
  },
  navTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.bgCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    marginRight: 8,
    justifyContent: 'center',
  },
  navTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  navTabText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  navTabTextActive: {
    color: '#0f172a',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
});
`;
    await fs.writeFile(path.join(mobileDir, 'src', 'navigation', 'AppNavigator.tsx'), navCode);

    // 9. Write App.tsx
    const appTsx = `import React from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Text } from 'react-native';
import { Header } from './src/components/Header';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Colors, Spacing } from './src/theme';

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgMain} />
      <View style={styles.container}>
        <Header appName="${appName}" tagline="${appDescription}" />
        <AppNavigator />
        <View style={styles.footer}>
          <Text style={styles.footerText}>AI App Factory • React Native + Expo • ${appName}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bgMain,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.bgMain,
    padding: Spacing.md,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderColor,
    marginTop: Spacing.xs,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
});
`;
    await fs.writeFile(path.join(mobileDir, 'App.tsx'), appTsx);

    // 10. Install dependencies and validate
    console.log(`[MobileGeneratorAgent] Installing dependencies in "${mobileDir}"...`);
    let dependencyInstallSuccess = false;
    let typeCheckSuccess = false;
    let validationSuccess = false;
    let validationError: string | undefined;

    try {
      await execAsync('npm install', { cwd: mobileDir });
      dependencyInstallSuccess = true;
      console.log(`[MobileGeneratorAgent] Dependencies installed successfully.`);

      console.log(`[MobileGeneratorAgent] Running TypeScript type validation (npx tsc --noEmit)...`);
      const { stdout: tscStdout, stderr: tscStderr } = await execAsync('npx tsc --noEmit', { cwd: mobileDir });
      console.log(`[MobileGeneratorAgent] TypeScript validation output: ${tscStdout || '0 errors'}`);
      if (tscStderr) {
        console.warn(`[MobileGeneratorAgent] TypeScript warnings: ${tscStderr}`);
      }
      typeCheckSuccess = true;
      validationSuccess = true;
    } catch (err: any) {
      validationError = err.message || String(err);
      console.error(`[MobileGeneratorAgent] Mobile project validation failed:\n${validationError}`);
    }

    const result: MobileGeneratorResult = {
      projectId,
      appName,
      mobileProjectPath: `projects/${projectId}/mobile`,
      screenCount: screens.length,
      generatedScreens: generatedScreenNames,
      dependencyInstallSuccess,
      typeCheckSuccess,
      validationSuccess,
      validationError,
      generatedAt: new Date().toISOString(),
    };

    // Save mobile-generator.json
    await fs.writeFile(
      path.join(projectFolderPath, 'mobile-generator.json'),
      JSON.stringify(result, null, 2),
      'utf-8'
    );

    // Update project.json state
    if (validationSuccess) {
      await stateManager.updateStage('MOBILE_GENERATION_COMPLETED');
      await stateManager.updateState({
        mobileGenerationComplete: true,
        mobileProjectPath: `projects/${projectId}/mobile`,
        mobileScreenCount: screens.length,
        mobileValidationSuccess: true,
      });
      console.log(`[MobileGeneratorAgent] React Native (Expo) Application generated and validated successfully at: ${mobileDir}`);
    } else {
      await stateManager.updateStage('MOBILE_GENERATION_FAILED');
      await stateManager.updateState({
        mobileGenerationComplete: false,
        mobileValidationSuccess: false,
        mobileValidationError: validationError,
      });
      throw new Error(`Mobile Application generation/validation failed: ${validationError}`);
    }

    return result;
  }
}
