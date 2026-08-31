import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectStateManager } from '../../orchestrator/project-state.js';
import { getLLMProvider, type ILLMProvider } from '../../tools/llm/index.js';
import { defaultAIGateway } from '../../infrastructure/ai/ai-gateway.js';
import type { IdeaValidationResult } from '../idea-validator/types.js';
import type { MarketResearchResult } from '../market-research/types.js';
import type {
  FutureFeature,
  MVPFeature,
  NavigationStructure,
  ProductSpecResult,
  ScreenSpec,
  TechStackRecommendation,
  UserJourney,
  UserPersona,
} from './types.js';

export class ProductStrategistAgent {
  private llmProvider: ILLMProvider;

  constructor(llmProvider?: ILLMProvider) {
    this.llmProvider = llmProvider || getLLMProvider();
  }

  /**
   * Validates and sanitizes raw LLM output against the expected ProductSpecResult schema.
   */
  private validateAndSanitizeResult(
    raw: any,
    projectId: string,
    idea: string
  ): ProductSpecResult {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid AI output for Product Spec: Expected JSON object.');
    }

    const appName = typeof raw.appName === 'string' && raw.appName.trim() ? raw.appName.trim() : 'AppFactory Product';
    const tagline = typeof raw.tagline === 'string' && raw.tagline.trim() ? raw.tagline.trim() : 'Smart digital product solution.';
    const targetAudience = typeof raw.targetAudience === 'string' && raw.targetAudience.trim() ? raw.targetAudience.trim() : 'Target users not specified.';

    const mvpFeatures: MVPFeature[] = Array.isArray(raw.mvpFeatures)
      ? raw.mvpFeatures.map((f: any) => ({
          name: typeof f.name === 'string' ? f.name.trim() : 'Core Feature',
          description: typeof f.description === 'string' ? f.description.trim() : '',
          priority: (['HIGH', 'MEDIUM', 'LOW'].includes(String(f.priority).toUpperCase())
            ? String(f.priority).toUpperCase()
            : 'HIGH') as 'HIGH' | 'MEDIUM' | 'LOW',
        }))
      : [];

    const futureFeatures: FutureFeature[] = Array.isArray(raw.futureFeatures)
      ? raw.futureFeatures.map((f: any) => ({
          name: typeof f.name === 'string' ? f.name.trim() : 'Future Feature',
          description: typeof f.description === 'string' ? f.description.trim() : '',
          phase: typeof f.phase === 'string' && f.phase.trim() ? f.phase.trim() : 'Phase 2',
        }))
      : [];

    const userPersonas: UserPersona[] = Array.isArray(raw.userPersonas)
      ? raw.userPersonas.map((p: any) => ({
          name: typeof p.name === 'string' ? p.name.trim() : 'User Persona',
          role: typeof p.role === 'string' ? p.role.trim() : 'Primary User',
          painPoints: Array.isArray(p.painPoints) ? p.painPoints.map((pt: any) => String(pt).trim()) : [],
          goals: Array.isArray(p.goals) ? p.goals.map((g: any) => String(g).trim()) : [],
        }))
      : [];

    const userJourneys: UserJourney[] = Array.isArray(raw.userJourneys)
      ? raw.userJourneys.map((j: any) => ({
          flowName: typeof j.flowName === 'string' ? j.flowName.trim() : 'Main User Flow',
          description: typeof j.description === 'string' ? j.description.trim() : '',
          steps: Array.isArray(j.steps) ? j.steps.map((s: any) => String(s).trim()) : [],
        }))
      : [];

    const screens: ScreenSpec[] = Array.isArray(raw.screens)
      ? raw.screens.map((s: any, idx: number) => ({
          id: typeof s.id === 'string' && s.id.trim() ? s.id.trim() : `screen_${idx + 1}`,
          name: typeof s.name === 'string' ? s.name.trim() : `Screen ${idx + 1}`,
          purpose: typeof s.purpose === 'string' ? s.purpose.trim() : 'Screen purpose',
          keyComponents: Array.isArray(s.keyComponents) ? s.keyComponents.map((c: any) => String(c).trim()) : [],
        }))
      : [];

    const navRaw = raw.navigationStructure || {};
    const navigationStructure: NavigationStructure = {
      type: typeof navRaw.type === 'string' && navRaw.type.trim() ? navRaw.type.trim() : 'Bottom Tab Bar + Stack Navigation',
      mainTabs: Array.isArray(navRaw.mainTabs) ? navRaw.mainTabs.map((t: any) => String(t).trim()) : [],
      routes: Array.isArray(navRaw.routes)
        ? navRaw.routes.map((r: any) => ({
            name: typeof r.name === 'string' ? r.name.trim() : 'Route',
            screenId: typeof r.screenId === 'string' ? r.screenId.trim() : '',
            description: typeof r.description === 'string' ? r.description.trim() : '',
          }))
        : [],
    };

    const techRaw = raw.techStack || {};
    const techStack: TechStackRecommendation = {
      frontend: typeof techRaw.frontend === 'string' ? techRaw.frontend.trim() : 'React Native / Expo (TypeScript)',
      backend: typeof techRaw.backend === 'string' ? techRaw.backend.trim() : 'Node.js / Express (TypeScript)',
      database: typeof techRaw.database === 'string' ? techRaw.database.trim() : 'PostgreSQL / Prisma ORM',
      auth: typeof techRaw.auth === 'string' ? techRaw.auth.trim() : 'Supabase Auth / JWT',
      hosting: typeof techRaw.hosting === 'string' ? techRaw.hosting.trim() : 'Vercel / Render',
    };

    const monetizationModel =
      typeof raw.monetizationModel === 'string' && raw.monetizationModel.trim()
        ? raw.monetizationModel.trim()
        : 'Freemium tier with premium subscription add-ons.';

    return {
      projectId,
      idea,
      appName,
      tagline,
      targetAudience,
      mvpFeatures,
      futureFeatures,
      userPersonas,
      userJourneys,
      screens,
      navigationStructure,
      techStack,
      monetizationModel,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Executes Product Strategist analysis to produce product-spec.json.
   */
  async generateSpec(
    projectId: string,
    idea: string,
    projectFolderPath: string,
    stateManager: ProjectStateManager,
    validationResult?: IdeaValidationResult,
    researchResult?: MarketResearchResult | null
  ): Promise<ProductSpecResult | null> {
    // Guard check: Skip if idea validation rejected the idea
    if (validationResult?.recommendation === 'REJECT') {
      console.log(`[ProductStrategistAgent] Skipping Product Spec because Idea Validation recommendation is "REJECT".`);
      await stateManager.updateState({
        productSpecSkipped: true,
        skipReason: 'Idea Validation rejected the product idea.',
      });
      return null;
    }

    console.log(`[ProductStrategistAgent] Starting product specification for project "${projectId}"...`);

    // 1. Update state to PRODUCT_SPEC stage
    await stateManager.updateStatus('IN_PROGRESS');
    await stateManager.updateStage('PRODUCT_SPEC');

    // 2. Load missing validation or research results from disk if necessary
    let valData = validationResult;
    if (!valData) {
      try {
        const valContent = await fs.readFile(path.join(projectFolderPath, 'idea-validation.json'), 'utf-8');
        valData = JSON.parse(valContent);
      } catch {
        // file optional
      }
    }

    let mktData = researchResult;
    if (!mktData) {
      try {
        const mktContent = await fs.readFile(path.join(projectFolderPath, 'market-research.json'), 'utf-8');
        mktData = JSON.parse(mktContent);
      } catch {
        // file optional
      }
    }

    // 3. Build prompt
    const systemPrompt = `You are a principal product manager and lead software architect.
Synthesize the provided Idea Validation and Market Research data to create a comprehensive, highly actionable Product Specification.
Return a valid JSON object matching this exact schema:
{
  "appName": "Creative and catchy App Name",
  "tagline": "Compelling one-line app description",
  "targetAudience": "Detailed target audience description",
  "mvpFeatures": [
    { "name": "Feature Name", "description": "Feature detail", "priority": "HIGH" }
  ],
  "futureFeatures": [
    { "name": "Phase 2 Feature", "description": "Future expansion feature", "phase": "Phase 2" }
  ],
  "userPersonas": [
    {
      "name": "Persona Name (e.g. Alex - College Sophomore)",
      "role": "Student / User Role",
      "painPoints": ["Pain point 1", "Pain point 2"],
      "goals": ["Goal 1", "Goal 2"]
    }
  ],
  "userJourneys": [
    {
      "flowName": "Onboarding & First Expense Log",
      "description": "Flow overview",
      "steps": ["Step 1", "Step 2", "Step 3"]
    }
  ],
  "screens": [
    {
      "id": "screen_dashboard",
      "name": "Dashboard Screen",
      "purpose": "Primary view displaying current budget balance and recent transactions",
      "keyComponents": ["Header Summary Card", "Transaction List", "Quick Add Floating Action Button"]
    }
  ],
  "navigationStructure": {
    "type": "Bottom Tab Bar + Stack Navigation",
    "mainTabs": ["Dashboard", "Expenses", "Bill Split", "Settings"],
    "routes": [
      { "name": "Dashboard", "screenId": "screen_dashboard", "description": "Main overview tab" }
    ]
  },
  "techStack": {
    "frontend": "React Native / Expo (TypeScript)",
    "backend": "Node.js / Express (TypeScript)",
    "database": "PostgreSQL / Prisma ORM",
    "auth": "Supabase Auth",
    "hosting": "Render / Vercel"
  },
  "monetizationModel": "Freemium model with premium analytics tier"
}`;

    const userPrompt = `App Idea: "${idea}"

Idea Validation Summary:
- Problem: ${valData?.problem || 'N/A'}
- Value Prop: ${valData?.valueProposition || 'N/A'}
- Score: ${valData?.score || 'N/A'}
- Recommendation: ${valData?.recommendation || 'N/A'}

Market Research Context:
- Target Market: ${mktData?.targetMarket || 'N/A'}
- Competitors: ${mktData?.competitors?.map((c) => c.name).join(', ') || 'N/A'}
- Market Gaps: ${mktData?.marketGaps?.join('; ') || 'N/A'}
- User Complaints: ${mktData?.userComplaints?.join('; ') || 'N/A'}
- Differentiation Opportunities: ${mktData?.differentiationOpportunities?.join('; ') || 'N/A'}`;

    // 4. Request structured generation from AIGateway
    const res = await defaultAIGateway.generate<any>({
      agent: 'ProductStrategistAgent',
      task: 'PRODUCT_STRATEGY',
      prompt: userPrompt,
      systemPrompt,
      projectId,
      responseFormat: 'json',
    });
    const rawAnalysis = res.output;

    // 5. Validate & sanitize result
    const specResult = this.validateAndSanitizeResult(rawAnalysis, projectId, idea);

    // 6. Save product-spec.json
    const outputFilePath = path.join(projectFolderPath, 'product-spec.json');
    await fs.writeFile(outputFilePath, JSON.stringify(specResult, null, 2), 'utf-8');
    console.log(`[ProductStrategistAgent] Product spec report saved to: ${outputFilePath}`);

    // 7. Update project state
    await stateManager.updateStage('PRODUCT_SPEC_COMPLETED');
    await stateManager.updateState({
      productSpecComplete: true,
      appName: specResult.appName,
      screenCount: specResult.screens.length,
      mvpFeatureCount: specResult.mvpFeatures.length,
    });

    console.log(
      `[ProductStrategistAgent] Product specification completed successfully. App Name: "${specResult.appName}", Screens: ${specResult.screens.length}, MVP Features: ${specResult.mvpFeatures.length}`
    );

    return specResult;
  }
}
