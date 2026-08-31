import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectStateManager } from '../../orchestrator/project-state.js';
import { getLLMProvider, type ILLMProvider } from '../../tools/llm/index.js';
import { defaultAIGateway } from '../../infrastructure/ai/ai-gateway.js';
import type { IdeaValidationResult } from '../idea-validator/types.js';
import type { ProductSpecResult } from '../product-strategist/types.js';
import type {
  ComponentInteraction,
  DesignRequirementsForStitch,
  NavigationFlow,
  ScreenUXSpec,
  SharedComponentSpec,
  UXSpecResult,
} from './types.js';

export class UXArchitectAgent {
  private llmProvider: ILLMProvider;

  constructor(llmProvider?: ILLMProvider) {
    this.llmProvider = llmProvider || getLLMProvider();
  }

  /**
   * Validates and sanitizes raw LLM output against the expected UXSpecResult schema.
   */
  private validateAndSanitizeResult(
    raw: any,
    projectId: string,
    idea: string,
    fallbackAppName: string
  ): UXSpecResult {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid AI output for UX Spec: Expected JSON object.');
    }

    const appName = typeof raw.appName === 'string' && raw.appName.trim() ? raw.appName.trim() : fallbackAppName;

    const screens: ScreenUXSpec[] = Array.isArray(raw.screens)
      ? raw.screens.map((s: any, idx: number) => ({
          screenId: typeof s.screenId === 'string' && s.screenId.trim() ? s.screenId.trim() : `screen_${idx + 1}`,
          screenName: typeof s.screenName === 'string' && s.screenName.trim() ? s.screenName.trim() : `Screen ${idx + 1}`,
          purpose: typeof s.purpose === 'string' ? s.purpose.trim() : 'Screen purpose not specified.',
          userGoal: typeof s.userGoal === 'string' ? s.userGoal.trim() : 'User goal not specified.',
          entryPoints: Array.isArray(s.entryPoints) ? s.entryPoints.map((e: any) => String(e).trim()) : [],
          exitActions: Array.isArray(s.exitActions) ? s.exitActions.map((e: any) => String(e).trim()) : [],
          layoutStructure: typeof s.layoutStructure === 'string' ? s.layoutStructure.trim() : 'Vertical column container',
          uiComponents: Array.isArray(s.uiComponents) ? s.uiComponents.map((c: any) => String(c).trim()) : [],
          componentInteractions: Array.isArray(s.componentInteractions)
            ? s.componentInteractions.map((ci: any) => ({
                componentName: typeof ci.componentName === 'string' ? ci.componentName.trim() : 'UI Component',
                trigger: typeof ci.trigger === 'string' ? ci.trigger.trim() : 'Tap',
                action: typeof ci.action === 'string' ? ci.action.trim() : 'Action',
                feedback: typeof ci.feedback === 'string' ? ci.feedback.trim() : 'Visual update',
              }))
            : [],
          requiredData: Array.isArray(s.requiredData) ? s.requiredData.map((d: any) => String(d).trim()) : [],
          loadingState: typeof s.loadingState === 'string' ? s.loadingState.trim() : 'Skeleton loader placeholder',
          emptyState: typeof s.emptyState === 'string' ? s.emptyState.trim() : 'Empty state illustration with action button',
          errorState: typeof s.errorState === 'string' ? s.errorState.trim() : 'Inline banner alert with Retry button',
          successState: typeof s.successState === 'string' ? s.successState.trim() : 'Toast notification & haptic confirmation',
          mobileConsiderations:
            typeof s.mobileConsiderations === 'string' ? s.mobileConsiderations.trim() : 'Minimum 48px touch targets, swipe-to-dismiss gesture',
        }))
      : [];

    const navigationFlows: NavigationFlow[] = Array.isArray(raw.navigationFlows)
      ? raw.navigationFlows.map((f: any) => ({
          flowName: typeof f.flowName === 'string' ? f.flowName.trim() : 'Navigation Flow',
          trigger: typeof f.trigger === 'string' ? f.trigger.trim() : 'User interaction',
          sequence: Array.isArray(f.sequence) ? f.sequence.map((seq: any) => String(seq).trim()) : [],
        }))
      : [];

    const globalRules = Array.isArray(raw.globalRules)
      ? raw.globalRules.map((r: any) => String(r).trim()).filter(Boolean)
      : [];

    const sharedComponents: SharedComponentSpec[] = Array.isArray(raw.sharedComponents)
      ? raw.sharedComponents.map((sc: any) => ({
          name: typeof sc.name === 'string' ? sc.name.trim() : 'Shared Component',
          description: typeof sc.description === 'string' ? sc.description.trim() : '',
          usedInScreens: Array.isArray(sc.usedInScreens) ? sc.usedInScreens.map((u: any) => String(u).trim()) : [],
        }))
      : [];

    const reqRaw = raw.designRequirementsForStitch || {};
    const designRequirementsForStitch: DesignRequirementsForStitch = {
      colorSemantics: Array.isArray(reqRaw.colorSemantics) ? reqRaw.colorSemantics.map((c: any) => String(c).trim()) : [],
      typographyGuidelines: typeof reqRaw.typographyGuidelines === 'string' ? reqRaw.typographyGuidelines.trim() : 'Modern sans-serif type scale (Inter/Roboto)',
      spacingAndGrid: typeof reqRaw.spacingAndGrid === 'string' ? reqRaw.spacingAndGrid.trim() : '8pt grid system (8px, 16px, 24px, 32px)',
      componentVariantsNeeded: Array.isArray(reqRaw.componentVariantsNeeded) ? reqRaw.componentVariantsNeeded.map((v: any) => String(v).trim()) : [],
      motionAndMicroInteractions: Array.isArray(reqRaw.motionAndMicroInteractions) ? reqRaw.motionAndMicroInteractions.map((m: any) => String(m).trim()) : [],
    };

    return {
      projectId,
      idea,
      appName,
      screens,
      navigationFlows,
      globalRules,
      sharedComponents,
      designRequirementsForStitch,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Executes UX Architect analysis to produce ux-spec.json.
   */
  async generateUXSpec(
    projectId: string,
    idea: string,
    projectFolderPath: string,
    stateManager: ProjectStateManager,
    validationResult?: IdeaValidationResult,
    specResult?: ProductSpecResult | null
  ): Promise<UXSpecResult | null> {
    // Guard check: Skip if idea validation rejected the idea
    if (validationResult?.recommendation === 'REJECT') {
      console.log(`[UXArchitectAgent] Skipping UX Spec because Idea Validation recommendation is "REJECT".`);
      await stateManager.updateState({
        uxSpecSkipped: true,
        skipReason: 'Idea Validation rejected the product idea.',
      });
      return null;
    }

    console.log(`[UXArchitectAgent] Starting UX specification for project "${projectId}"...`);

    // 1. Update state to UX_SPEC stage
    await stateManager.updateStatus('IN_PROGRESS');
    await stateManager.updateStage('UX_SPEC');

    // 2. Load product-spec.json if not provided
    let prodSpec = specResult;
    if (!prodSpec) {
      try {
        const specContent = await fs.readFile(path.join(projectFolderPath, 'product-spec.json'), 'utf-8');
        prodSpec = JSON.parse(specContent);
      } catch {
        console.warn(`[UXArchitectAgent] product-spec.json not found on disk. Proceeding with basic context.`);
      }
    }

    // 3. Build prompt ensuring EVERY screen in product-spec is defined with UX requirements
    const systemPrompt = `You are a principal UX architect and interaction design director.
Using the provided Product Specification (especially the list of screens), design a complete, rigorous UX Specification.
Do NOT output code, visual designs, or HTML/CSS. Focus purely on interaction architecture, screen UX specs, states, navigation flows, and design system requirements for Stitch.

Return a valid JSON object matching this exact schema:
{
  "appName": "${prodSpec?.appName || 'App Name'}",
  "screens": [
    {
      "screenId": "screen_dashboard",
      "screenName": "Dashboard Screen",
      "purpose": "Primary view displaying daily spendable budget and recent activity",
      "userGoal": "Instantly know how much money can be spent today",
      "entryPoints": ["App Launch", "Tab Bar: Dashboard"],
      "exitActions": ["Tap Quick Add -> Open Add Expense Modal", "Tap Activity -> Transaction Details"],
      "layoutStructure": "Header hero card + middle scrollable feed + bottom tab bar",
      "uiComponents": ["Daily Budget Hero Card", "Recent Expense List", "Quick Log FAB"],
      "componentInteractions": [
        {
          "componentName": "Quick Log FAB",
          "trigger": "Single tap",
          "action": "Opens Quick Add Expense modal sheet",
          "feedback": "Haptic pulse and smooth slide-up animation"
        }
      ],
      "requiredData": ["dailyBudgetLimit", "todaySpent", "recentTransactions"],
      "loadingState": "Skeleton pulses for hero card and transaction list items",
      "emptyState": "Friendly illustration with text 'No expenses logged today! Enjoy your budget.'",
      "errorState": "Banner alert 'Unable to sync offline transactions' with 'Tap to Retry'",
      "successState": "Green haptic toast 'Expense added!' floating at top of screen",
      "mobileConsiderations": "Thumb-zone placement for FAB; minimum 48px touch targets; swipe right to refresh"
    }
  ],
  "navigationFlows": [
    {
      "flowName": "Logging an Expense Flow",
      "trigger": "Tap Quick Add FAB",
      "sequence": ["Dashboard Screen", "Quick Add Expense Modal", "Success Confirmation", "Dashboard Screen"]
    }
  ],
  "globalRules": [
    "All touch targets must be at least 48x48dp",
    "Optimistic UI updates for immediate user feedback",
    "Support offline queuing for all data entry actions"
  ],
  "sharedComponents": [
    {
      "name": "Header Hero Card",
      "description": "Standardized summary card with primary metric and status badge",
      "usedInScreens": ["screen_dashboard", "screen_aid_pacer"]
    }
  ],
  "designRequirementsForStitch": {
    "colorSemantics": ["Primary Brand Navy", "Success Emerald Green", "Alert Coral Red", "Neutral Slate Background"],
    "typographyGuidelines": "Sans-serif type scale (Inter), bold 28pt headings, 16pt body, 12pt caption",
    "spacingAndGrid": "8pt grid system (8, 16, 24, 32, 48px spacing tokens)",
    "componentVariantsNeeded": ["Primary Button (Default, Hover, Active, Disabled, Loading)", "Input Field (Default, Focused, Error, Valid)"],
    "motionAndMicroInteractions": ["Slide-up modal transitions (250ms ease-out)", "Subtle scale-press (0.96x) on primary buttons"]
  }
}`;

    const userPrompt = `App Idea: "${idea}"

Product Spec Summary:
- App Name: ${prodSpec?.appName || 'App'}
- Tagline: ${prodSpec?.tagline || 'N/A'}
- Target Audience: ${prodSpec?.targetAudience || 'N/A'}
- Defined Screens:
${prodSpec?.screens?.map((s) => `- ${s.id} (${s.name}): ${s.purpose}`).join('\n') || 'No screen list defined'}

Task: Generate a detailed UX specification covering EVERY screen listed above, complete with layout structures, component interactions, 4 states (loading, empty, error, success), mobile considerations, navigation flows, global rules, shared components, and design requirements for Stitch.`;

    // 4. Request structured JSON generation from AIGateway
    const res = await defaultAIGateway.generate<any>({
      agent: 'UXArchitectAgent',
      task: 'UX_ARCHITECTURE',
      prompt: userPrompt,
      systemPrompt,
      projectId,
      responseFormat: 'json',
    });
    const rawAnalysis = res.output;

    // 5. Validate and sanitize response
    const uxResult = this.validateAndSanitizeResult(rawAnalysis, projectId, idea, prodSpec?.appName || 'App');

    // 6. Save ux-spec.json
    const outputFilePath = path.join(projectFolderPath, 'ux-spec.json');
    await fs.writeFile(outputFilePath, JSON.stringify(uxResult, null, 2), 'utf-8');
    console.log(`[UXArchitectAgent] UX spec report saved to: ${outputFilePath}`);

    // 7. Update project state
    await stateManager.updateStage('UX_SPEC_COMPLETED');
    await stateManager.updateState({
      uxSpecComplete: true,
      uxScreenCount: uxResult.screens.length,
      navigationFlowCount: uxResult.navigationFlows.length,
    });

    console.log(
      `[UXArchitectAgent] UX specification completed successfully. Screens specified: ${uxResult.screens.length}, Navigation Flows: ${uxResult.navigationFlows.length}`
    );

    return uxResult;
  }
}
