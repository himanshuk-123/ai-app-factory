import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectStateManager } from '../../orchestrator/project-state.js';
import { getStitchProvider, MockStitchProvider, type IStitchProvider, type StitchDesignResult, type StitchScreenResult } from '../../tools/stitch/index.js';
import type { IdeaValidationResult } from '../idea-validator/types.js';
import type { UXSpecResult } from '../ux-architect/types.js';

export class StitchDesignerAgent {
  private stitchProvider: IStitchProvider;

  constructor(stitchProvider?: IStitchProvider) {
    this.stitchProvider = stitchProvider || getStitchProvider();
  }

  /**
   * Executes Stitch Design creation based on ux-spec.json inputs.
   */
  async design(
    projectId: string,
    idea: string,
    projectFolderPath: string,
    stateManager: ProjectStateManager,
    validationResult?: IdeaValidationResult,
    uxResult?: UXSpecResult | null
  ): Promise<StitchDesignResult | null> {
    // Guard check: Skip if idea validation rejected the idea
    if (validationResult?.recommendation === 'REJECT') {
      console.log(`[StitchDesignerAgent] Skipping Stitch Design because Idea Validation recommendation is "REJECT".`);
      await stateManager.updateState({
        stitchDesignSkipped: true,
        skipReason: 'Idea Validation rejected the product idea.',
      });
      return null;
    }

    console.log(`[StitchDesignerAgent] Starting Stitch Design generation for project "${projectId}"...`);

    // 1. Update state to STITCH_DESIGN stage
    await stateManager.updateStatus('IN_PROGRESS');
    await stateManager.updateStage('STITCH_DESIGN');

    // 2. Read ux-spec.json if not provided
    let uxData = uxResult;
    if (!uxData) {
      try {
        const content = await fs.readFile(path.join(projectFolderPath, 'ux-spec.json'), 'utf-8');
        uxData = JSON.parse(content);
      } catch {
        console.warn(`[StitchDesignerAgent] ux-spec.json not found on disk.`);
      }
    }

    const appName = uxData?.appName || 'AppFactory Product';
    const screensToGenerate = uxData?.screens || [];
    const designReqs = uxData?.designRequirementsForStitch;

    let stitchProjectId: string | undefined;
    let projectError: string | undefined;
    let providerUsed = this.stitchProvider;

    // 3. Attempt Stitch project creation via MCP provider
    try {
      console.log(`[StitchDesignerAgent] Creating Stitch project via provider: ${providerUsed.name}...`);
      const proj = await providerUsed.createProject(appName);
      stitchProjectId = proj.id;
    } catch (err: any) {
      projectError = err.message || String(err);
      console.warn(`[StitchDesignerAgent] Stitch MCP project creation error: ${projectError}`);
      
      // Fallback to MockStitchProvider for local design structure creation while logging explicit MCP error
      console.log(`[StitchDesignerAgent] Utilizing MockStitchProvider fallback to structure design references...`);
      providerUsed = new MockStitchProvider();
      try {
        const proj = await providerUsed.createProject(appName);
        stitchProjectId = proj.id;
      } catch (fallbackErr: any) {
        projectError = fallbackErr.message;
      }
    }

    // 4. Generate screens
    const screenResults: StitchScreenResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    if (stitchProjectId) {
      for (const screen of screensToGenerate) {
        console.log(`[StitchDesignerAgent] Generating Stitch screen "${screen.screenName}" (${screen.screenId})...`);
        const prompt = `Screen: ${screen.screenName} (${screen.screenId})
Purpose: ${screen.purpose}
User Goal: ${screen.userGoal}
Layout Structure: ${screen.layoutStructure}
UI Components: ${screen.uiComponents.join(', ')}
Design Directives:
- Color Semantics: ${designReqs?.colorSemantics?.join(', ') || 'Modern high-contrast palette'}
- Typography: ${designReqs?.typographyGuidelines || 'Clean sans-serif type scale'}
- Spacing: ${designReqs?.spacingAndGrid || '8pt spatial grid'}`;

        try {
          const res = await providerUsed.generateScreen(stitchProjectId, screen.screenName, prompt);
          screenResults.push({
            screenId: screen.screenId,
            screenName: screen.screenName,
            stitchScreenId: res.screenId,
            status: 'GENERATED',
            previewUrl: res.previewUrl,
            downloadUrl: res.downloadUrl,
            htmlUrl: res.htmlUrl,
            theme: res.theme,
          });
          successCount++;
        } catch (screenErr: any) {
          const errMsg = screenErr.message || String(screenErr);
          console.error(`[StitchDesignerAgent] Screen generation failed for "${screen.screenName}": ${errMsg}`);
          screenResults.push({
            screenId: screen.screenId,
            screenName: screen.screenName,
            status: 'FAILED',
            error: errMsg,
          });
          failureCount++;
        }
      }
    }

    // 5. Determine overall generation status
    let overallStatus: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED' = 'SUCCESS';
    if (!stitchProjectId || failureCount === screensToGenerate.length) {
      overallStatus = 'FAILED';
    } else if (failureCount > 0 || projectError) {
      overallStatus = 'PARTIAL_SUCCESS';
    }

    const designResult: StitchDesignResult = {
      projectId,
      appName,
      stitchProjectId,
      status: overallStatus,
      error: projectError,
      screens: screenResults,
      designSystemApplied: true,
      generatedAt: new Date().toISOString(),
    };

    // 6. Save stitch-design.json
    const outputFilePath = path.join(projectFolderPath, 'stitch-design.json');
    await fs.writeFile(outputFilePath, JSON.stringify(designResult, null, 2), 'utf-8');
    console.log(`[StitchDesignerAgent] Stitch design report saved to: ${outputFilePath}`);

    // 7. Update project.json state
    const isSuccess = overallStatus === 'SUCCESS' || overallStatus === 'PARTIAL_SUCCESS';
    const stageName = isSuccess ? 'STITCH_DESIGN_COMPLETED' : 'STITCH_DESIGN_FAILED';

    await stateManager.updateStage(stageName);
    await stateManager.updateState({
      stitchDesignComplete: isSuccess,
      stitchProjectId,
      stitchStatus: overallStatus,
      stitchScreensGenerated: successCount,
      stitchScreensFailed: failureCount,
      stitchError: projectError || null,
    });

    console.log(
      `[StitchDesignerAgent] Stitch design stage finished. Status: ${overallStatus}, Project ID: ${stitchProjectId}, Generated: ${successCount}, Failed: ${failureCount}`
    );

    return designResult;
  }
}
