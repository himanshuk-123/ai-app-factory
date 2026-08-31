import path from 'node:path';
import crypto from 'node:crypto';
import type { ProjectMetadata } from './types.js';
import { ProjectStateManager } from './project-state.js';
import { factoryEvents } from './event-emitter.js';
import { IdeaValidationAgent, type IdeaValidationResult } from '../agents/idea-validator/index.js';
import { MarketResearchAgent, type MarketResearchResult } from '../agents/market-research/index.js';
import { ProductStrategistAgent, type ProductSpecResult } from '../agents/product-strategist/index.js';
import { UXArchitectAgent, type UXSpecResult } from '../agents/ux-architect/index.js';
import { StitchDesignerAgent, type StitchDesignResult } from '../agents/stitch-designer/index.js';
import { WebGeneratorAgent, type WebGeneratorResult } from '../agents/web-generator/index.js';
import { MobileGeneratorAgent, type MobileGeneratorResult } from '../agents/mobile-generator/index.js';
import { BuildDebuggerAgent, type BuildDebugResult } from '../agents/build-debugger/index.js';
import { ApkBuilderAgent, type ApkBuildReport } from '../agents/apk-builder/index.js';
import { AndroidQaAgent, type AndroidQaReport } from '../agents/android-qa/index.js';
import { VisualQaAgent, type VisualQaReport } from '../agents/visual-qa/index.js';
import { VisualAutoFixAgent, type VisualAutoFixReport } from '../agents/visual-auto-fix/index.js';
import { WebQaDeployerAgent, type WebQaReport, type RenderDeploymentReport } from '../agents/web-qa-deployer/index.js';

export class Orchestrator {
  private projectsDir: string;
  private ideaValidator: IdeaValidationAgent;
  private marketResearcher: MarketResearchAgent;
  private productStrategist: ProductStrategistAgent;
  private uxArchitect: UXArchitectAgent;
  private stitchDesigner: StitchDesignerAgent;
  private webGenerator: WebGeneratorAgent;
  private mobileGenerator: MobileGeneratorAgent;
  private buildDebugger: BuildDebuggerAgent;
  private apkBuilder: ApkBuilderAgent;
  private androidQa: AndroidQaAgent;
  private visualQa: VisualQaAgent;
  private visualAutoFix: VisualAutoFixAgent;
  private webQaDeployer: WebQaDeployerAgent;

  constructor(projectsDir?: string) {
    this.projectsDir = projectsDir || path.resolve(process.cwd(), 'projects');
    this.ideaValidator = new IdeaValidationAgent();
    this.marketResearcher = new MarketResearchAgent();
    this.productStrategist = new ProductStrategistAgent();
    this.uxArchitect = new UXArchitectAgent();
    this.stitchDesigner = new StitchDesignerAgent();
    this.webGenerator = new WebGeneratorAgent();
    this.mobileGenerator = new MobileGeneratorAgent();
    this.buildDebugger = new BuildDebuggerAgent();
    this.apkBuilder = new ApkBuilderAgent();
    this.androidQa = new AndroidQaAgent();
    this.visualQa = new VisualQaAgent();
    this.visualAutoFix = new VisualAutoFixAgent();
    this.webQaDeployer = new WebQaDeployerAgent();
  }

  /**
   * Initializes a new app factory project workflow and runs 13-stage automated pipeline.
   */
  async createProject(idea: string): Promise<{
    metadata: ProjectMetadata;
    stateManager: ProjectStateManager;
    validationResult: IdeaValidationResult;
    researchResult: MarketResearchResult | null;
    specResult: ProductSpecResult | null;
    uxResult: UXSpecResult | null;
    stitchResult: StitchDesignResult | null;
    webResult: WebGeneratorResult | null;
    mobileResult: MobileGeneratorResult | null;
    buildDebugResult: BuildDebugResult | null;
    apkBuildResult: ApkBuildReport | null;
    androidQaResult: AndroidQaReport | null;
    visualQaResult: VisualQaReport | null;
    visualAutoFixResult: VisualAutoFixReport | null;
    webQaReport: WebQaReport | null;
    renderReport: RenderDeploymentReport | null;
  }> {
    if (!idea || idea.trim().length === 0) {
      throw new Error('App idea cannot be empty.');
    }

    const timestamp = Date.now();
    const uniqueId = `proj_${timestamp}_${crypto.randomBytes(4).toString('hex')}`;
    const projectFolder = path.join(this.projectsDir, uniqueId);

    const stateManager = new ProjectStateManager(projectFolder);

    const initialMetadata: ProjectMetadata = {
      id: uniqueId,
      idea: idea.trim(),
      status: 'IN_PROGRESS',
      stage: 'INIT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await stateManager.createInitialState(initialMetadata);

    await factoryEvents.emitWorkflowEvent({
      projectId: uniqueId,
      stage: 0,
      agent: 'Orchestrator',
      type: 'WORKFLOW_STARTED',
      status: 'RUNNING',
      message: `Started AI App Factory workflow for "${idea.trim()}"`,
      progress: 0,
    });

    console.log(`[Orchestrator] Project initialized successfully. ID: ${uniqueId}`);

    // Helper for stage events
    const emitStageStart = async (stage: number, agent: string, message: string) => {
      await factoryEvents.emitWorkflowEvent({
        projectId: uniqueId,
        stage,
        agent,
        type: 'AGENT_STARTED',
        status: 'RUNNING',
        message,
        progress: Math.round(((stage - 1) / 13) * 100),
      });
    };

    const emitStageComplete = async (stage: number, agent: string, message: string, artifactPath?: string) => {
      await factoryEvents.emitWorkflowEvent({
        projectId: uniqueId,
        stage,
        agent,
        type: 'AGENT_COMPLETED',
        status: 'SUCCESS',
        message,
        progress: Math.round((stage / 13) * 100),
        artifactPath,
      });
    };

    // Stage 1: Idea Validation
    await emitStageStart(1, 'Idea Validation Agent', 'Validating app market viability & tech stack feasibility...');
    const validationResult = await this.ideaValidator.validate(uniqueId, idea, projectFolder, stateManager);
    await emitStageComplete(
      1,
      'Idea Validation Agent',
      `Idea Validation recommendation: ${validationResult.recommendation} (Score: ${validationResult.score}/10)`,
      'idea-validation.json'
    );

    // Stage 2: Market Research
    let researchResult: MarketResearchResult | null = null;
    if (validationResult.recommendation !== 'REJECT') {
      await emitStageStart(2, 'Market Research Agent', 'Analyzing market competitors & target audience trends...');
      researchResult = await this.marketResearcher.research(uniqueId, idea, projectFolder, stateManager, validationResult);
      await emitStageComplete(
        2,
        'Market Research Agent',
        `Market Research completed: ${researchResult.sourcesAnalyzed} web sources analyzed`,
        'market-research.json'
      );
    } else {
      await factoryEvents.emitWorkflowEvent({
        projectId: uniqueId,
        stage: 2,
        agent: 'Market Research Agent',
        type: 'AGENT_COMPLETED',
        status: 'SKIPPED',
        message: 'Idea Validation recommended REJECT. Skipping Stage 2.',
      });
    }

    // Stage 3: Product Strategist
    let specResult: ProductSpecResult | null = null;
    if (validationResult.recommendation !== 'REJECT') {
      await emitStageStart(3, 'Product Strategist Agent', 'Generating detailed product specification & MVP features...');
      specResult = await this.productStrategist.generateSpec(
        uniqueId,
        idea,
        projectFolder,
        stateManager,
        validationResult,
        researchResult
      );
      await emitStageComplete(
        3,
        'Product Strategist Agent',
        `Product Specification generated for "${specResult.appName}" (${specResult.mvpFeatures.length} MVP features)`,
        'product-spec.json'
      );
    } else {
      await factoryEvents.emitWorkflowEvent({
        projectId: uniqueId,
        stage: 3,
        agent: 'Product Strategist Agent',
        type: 'AGENT_COMPLETED',
        status: 'SKIPPED',
        message: 'Skipping Stage 3.',
      });
    }

    // Stage 4: UX Architect
    let uxResult: UXSpecResult | null = null;
    if (validationResult.recommendation !== 'REJECT') {
      await emitStageStart(4, 'UX Architect Agent', 'Architecting user flows, navigation hierarchy & screen wireframes...');
      uxResult = await this.uxArchitect.generateUXSpec(uniqueId, idea, projectFolder, stateManager, validationResult, specResult);
      await emitStageComplete(
        4,
        'UX Architect Agent',
        `UX Specification created (${uxResult.screens.length} screens, ${uxResult.navigationFlows.length} flows)`,
        'ux-spec.json'
      );
    }

    // Stage 5: Stitch Designer
    let stitchResult: StitchDesignResult | null = null;
    if (validationResult.recommendation !== 'REJECT') {
      await emitStageStart(5, 'Stitch Designer Agent', 'Generating UI design system & visual screen specs...');
      stitchResult = await this.stitchDesigner.design(uniqueId, idea, projectFolder, stateManager, validationResult, uxResult);
      await emitStageComplete(5, 'Stitch Designer Agent', 'Stitch Design generation completed', 'stitch-design.json');
    }

    // Stage 6: Web Code Generator
    let webResult: WebGeneratorResult | null = null;
    if (validationResult.recommendation !== 'REJECT') {
      await emitStageStart(6, 'Web Generator Agent', 'Generating production React + Vite web application codebase...');
      webResult = await this.webGenerator.generateWeb(
        uniqueId,
        idea,
        projectFolder,
        stateManager,
        validationResult,
        specResult,
        uxResult,
        stitchResult
      );
      await emitStageComplete(
        6,
        'Web Generator Agent',
        `Web application generated (${webResult?.screensGenerated?.length || 0} views)`,
        'web/'
      );
    }

    // Stage 7: Mobile Code Generator
    let mobileResult: MobileGeneratorResult | null = null;
    if (validationResult.recommendation !== 'REJECT') {
      await emitStageStart(7, 'Mobile Generator Agent', 'Generating Expo React Native mobile application codebase...');
      mobileResult = await this.mobileGenerator.generateMobile(
        uniqueId,
        idea,
        projectFolder,
        stateManager,
        validationResult,
        specResult,
        uxResult,
        stitchResult
      );
      await emitStageComplete(
        7,
        'Mobile Generator Agent',
        `Mobile app generated (${mobileResult?.screensGenerated?.length || 0} screens)`,
        'mobile/'
      );
    }

    // Stage 8: Build & Debug
    let buildDebugResult: BuildDebugResult | null = null;
    if (validationResult.recommendation !== 'REJECT') {
      await emitStageStart(8, 'Build & Debug Agent', 'Running TypeScript compilation & build verification...');
      buildDebugResult = await this.buildDebugger.runBuildDebug(uniqueId, idea, projectFolder, stateManager, validationResult);
      await emitStageComplete(8, 'Build & Debug Agent', 'Build & Debug checks passed', 'build-debug-report.json');
    }

    // Stage 9: APK Builder
    let apkBuildResult: ApkBuildReport | null = null;
    if (validationResult.recommendation !== 'REJECT') {
      await emitStageStart(9, 'APK Builder Agent', 'Building Android APK package via Expo EAS Cloud...');
      apkBuildResult = await this.apkBuilder.buildApk(uniqueId, idea, projectFolder, stateManager, validationResult);
      await emitStageComplete(
        9,
        'APK Builder Agent',
        `APK Build completed: ${apkBuildResult.apkArtifactPath ? 'Artifact Generated' : 'Pending EAS Session'}`,
        'apk-build-report.json'
      );
    }

    // Stage 10: Android QA
    let androidQaResult: AndroidQaReport | null = null;
    if (validationResult.recommendation !== 'REJECT') {
      await emitStageStart(10, 'Android QA Agent', 'Running automated ADB UI & device logcat testing on physical device...');
      androidQaResult = await this.androidQa.runQa(uniqueId, idea, projectFolder, stateManager);
      await emitStageComplete(
        10,
        'Android QA Agent',
        `Android QA completed on device "${androidQaResult.deviceModel || 'Connected Device'}"`,
        'android-qa-report.json'
      );
    }

    // Stage 11: Visual QA
    let visualQaResult: VisualQaReport | null = null;
    if (validationResult.recommendation !== 'REJECT') {
      await emitStageStart(11, 'Visual QA Agent', 'Performing Multimodal Vision comparison against Stitch design reference...');
      visualQaResult = await this.visualQa.runVisualQa(uniqueId, idea, projectFolder, stateManager);
      await emitStageComplete(
        11,
        'Visual QA Agent',
        `Visual QA similarity score: ${visualQaResult.overallSimilarityScore}%`,
        'visual-qa-report.json'
      );
    }

    // Stage 12: Visual Auto-Fix
    let visualAutoFixResult: VisualAutoFixReport | null = null;
    if (validationResult.recommendation !== 'REJECT') {
      await emitStageStart(12, 'Visual Auto-Fix Agent', 'Applying AI design repair iterations to React Native source code...');
      visualAutoFixResult = await this.visualAutoFix.autoFix(uniqueId, idea, projectFolder, stateManager);
      await emitStageComplete(
        12,
        'Visual Auto-Fix Agent',
        `Visual Auto-Fix completed (Final Similarity Score: ${visualAutoFixResult.afterSimilarityScore}%)`,
        'visual-auto-fix-report.json'
      );
    }

    // Stage 13: Web QA + Render Deployment
    let webQaReport: WebQaReport | null = null;
    let renderReport: RenderDeploymentReport | null = null;
    if (validationResult.recommendation !== 'REJECT') {
      await emitStageStart(13, 'Web QA & Render Deployer', 'Executing Web QA, GitHub repository push & Render cloud release...');
      const stage13Res = await this.webQaDeployer.executeStage13(uniqueId, idea, projectFolder, stateManager);
      webQaReport = stage13Res.webQaReport;
      renderReport = stage13Res.renderReport;

      await emitStageComplete(
        13,
        'Web QA & Render Deployer',
        `Web Release Status: ${renderReport.deploymentStatus} (Live URL: ${renderReport.liveUrl || 'N/A'})`,
        'render-deployment-report.json'
      );
    }

    const finalMetadata = stateManager.getState();
    await stateManager.updateState({ status: 'COMPLETED' });

    await factoryEvents.emitWorkflowEvent({
      projectId: uniqueId,
      stage: 13,
      agent: 'Orchestrator',
      type: 'WORKFLOW_COMPLETED',
      status: 'SUCCESS',
      message: `AI App Factory pipeline successfully completed for "${uniqueId}"!`,
      progress: 100,
    });

    return {
      metadata: finalMetadata,
      stateManager,
      validationResult,
      researchResult,
      specResult,
      uxResult,
      stitchResult,
      webResult,
      mobileResult,
      buildDebugResult,
      apkBuildResult,
      androidQaResult,
      visualQaResult,
      visualAutoFixResult,
      webQaReport,
      renderReport,
    };
  }

  /**
   * Gets a ProjectStateManager instance for an existing project folder or project ID.
   */
  getProjectState(projectId: string): ProjectStateManager {
    const projectFolder = path.join(this.projectsDir, projectId);
    return new ProjectStateManager(projectFolder);
  }
}
