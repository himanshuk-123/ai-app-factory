import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ProjectStateManager } from '../src/orchestrator/project-state.js';
import { StitchDesignerAgent } from '../src/agents/stitch-designer/stitch-designer.js';

dotenv.config();

/**
 * Standalone Stitch Designer Agent Test Script
 * Runs StitchDesignerAgent directly to demonstrate project and screen generation.
 */
async function testStitchAgent() {
  const projectId = `proj_stitch_test_${Date.now()}`;
  const idea = 'AI Fitness and Workout Plan Tracker with real-time posture feedback.';
  const projectFolder = path.resolve(process.cwd(), 'projects', projectId);

  console.log('==================================================');
  console.log('🎨 TESTING STITCH DESIGNER AGENT DIRECTLY');
  console.log(`Project ID: ${projectId}`);
  console.log(`Idea: "${idea}"`);
  console.log('==================================================\n');

  // 1. Create project folder & state
  await fs.mkdir(projectFolder, { recursive: true });
  const stateManager = new ProjectStateManager(projectFolder);
  await stateManager.createInitialState({
    id: projectId,
    idea,
    status: 'IN_PROGRESS',
    stage: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 2. Prepare mock ux-spec.json input for Stitch
  const mockUxSpec = {
    projectId,
    appName: 'FitVision AI',
    screens: [
      {
        screenId: 'screen_workout_dash',
        screenName: 'Workout & Posture Dashboard',
        purpose: 'Displays live camera feed, active exercise stats, and posture score gauge.',
        userGoal: 'Start a workout session and view real-time posture correction indicators.',
        layoutStructure: 'Top camera view area -> Split stats cards (Reps, Calories, Form Score) -> Floating Start Workout CTA',
        uiComponents: ['Camera Viewport', 'Form Score Gauge Pill', 'Reps Stat Card', 'Primary Action Button'],
      },
      {
        screenId: 'screen_analytics',
        screenName: 'Weekly Performance Analytics',
        purpose: 'Visualizes weekly workout consistency, calorie burn trends, and muscle group balance.',
        userGoal: 'Analyze weekly progress and view AI recommendations for rest days.',
        layoutStructure: 'Weekly Bar Chart -> Muscle Group Radar Diagram -> AI Recommendation Alert Card',
        uiComponents: ['Bar Chart', 'Radar Diagram', 'Alert Banner', 'Date Selector'],
      },
    ],
    designRequirementsForStitch: {
      colorSemantics: ['Neon Lime Accent (#84CC16)', 'Dark Charcoal Background (#0F172A)', 'Card Surface (#1E293B)', 'High Contrast White Text'],
      typographyGuidelines: 'Modern geometric sans-serif (Outfit / Inter) with bold display metrics',
      spacingAndGrid: '8pt spatial grid with generous touch targets (min 48px)',
    },
  };

  const uxSpecPath = path.join(projectFolder, 'ux-spec.json');
  await fs.writeFile(uxSpecPath, JSON.stringify(mockUxSpec, null, 2), 'utf-8');
  console.log(`✅ Created mock ux-spec.json at: ${uxSpecPath}\n`);

  // 3. Instantiate and run StitchDesignerAgent
  console.log('--- 🚀 Running StitchDesignerAgent.design(...) ---');
  const agent = new StitchDesignerAgent();
  const result = await agent.design(
    projectId,
    idea,
    projectFolder,
    stateManager,
    { recommendation: 'PROCEED', score: 9.0, summary: 'Viable concept' },
    mockUxSpec as any
  );

  console.log('\n==================================================');
  console.log('📊 STITCH DESIGNER AGENT RESULT REPORT:');
  console.log(JSON.stringify(result, null, 2));
  console.log('==================================================\n');

  // 4. Verify stitch-design.json on disk
  const stitchReportPath = path.join(projectFolder, 'stitch-design.json');
  try {
    const savedContent = await fs.readFile(stitchReportPath, 'utf-8');
    console.log(`📄 Saved stitch-design.json verified on disk (${savedContent.length} bytes).`);
  } catch (err: any) {
    console.error(`❌ Failed to read stitch-design.json: ${err.message}`);
  }
}

testStitchAgent().catch((err) => console.error('Error running Stitch Agent Test:', err));
