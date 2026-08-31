import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectStateManager } from '../../orchestrator/project-state.js';
import { getLLMProvider, type ILLMProvider } from '../../tools/llm/index.js';
import { defaultAIGateway } from '../../infrastructure/ai/ai-gateway.js';
import type { IdeaValidationResult, Recommendation } from './types.js';

export class IdeaValidationAgent {
  private llmProvider: ILLMProvider;

  constructor(llmProvider?: ILLMProvider) {
    this.llmProvider = llmProvider || getLLMProvider();
  }

  /**
   * Validates and sanitizes raw LLM output against the expected IdeaValidationResult schema.
   */
  private validateAndSanitizeResult(
    raw: any,
    projectId: string,
    idea: string
  ): IdeaValidationResult {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid AI output: Response must be a JSON object.');
    }

    const problem =
      typeof raw.problem === 'string' && raw.problem.trim()
        ? raw.problem.trim()
        : 'Problem statement not provided.';

    const targetUsers = Array.isArray(raw.targetUsers)
      ? raw.targetUsers.map((u: any) => String(u).trim()).filter(Boolean)
      : typeof raw.targetUsers === 'string' && raw.targetUsers.trim()
        ? [raw.targetUsers.trim()]
        : ['Target users not specified'];

    const valueProposition =
      typeof raw.valueProposition === 'string' && raw.valueProposition.trim()
        ? raw.valueProposition.trim()
        : 'Value proposition not provided.';

    const competitionAssessment =
      typeof raw.competitionAssessment === 'string' && raw.competitionAssessment.trim()
        ? raw.competitionAssessment.trim()
        : 'Competition assessment not provided.';

    const differentiation =
      typeof raw.differentiation === 'string' && raw.differentiation.trim()
        ? raw.differentiation.trim()
        : 'Differentiation opportunity not provided.';

    const technicalFeasibility =
      typeof raw.technicalFeasibility === 'string' && raw.technicalFeasibility.trim()
        ? raw.technicalFeasibility.trim()
        : 'Technical feasibility not provided.';

    const monetizationPotential =
      typeof raw.monetizationPotential === 'string' && raw.monetizationPotential.trim()
        ? raw.monetizationPotential.trim()
        : 'Monetization potential not provided.';

    const keyRisks = Array.isArray(raw.keyRisks)
      ? raw.keyRisks.map((r: any) => String(r).trim()).filter(Boolean)
      : typeof raw.keyRisks === 'string' && raw.keyRisks.trim()
        ? [raw.keyRisks.trim()]
        : ['Key risks not specified'];

    let rawScoreStr = String(raw.score ?? '');
    let score = parseFloat(rawScoreStr);
    if (isNaN(score) || score < 1 || score > 10) {
      score = 7.0;
    }
    score = Math.round(score * 10) / 10;

    let recommendation: Recommendation = 'PROCEED';
    if (typeof raw.recommendation === 'string') {
      const recUpper = raw.recommendation.toUpperCase().trim();
      if (recUpper === 'PROCEED' || recUpper === 'MODIFY' || recUpper === 'REJECT') {
        recommendation = recUpper as Recommendation;
      } else if (recUpper.includes('REJECT') || recUpper.includes('DO NOT BUILD')) {
        recommendation = 'REJECT';
      } else if (recUpper.includes('MODIFY') || recUpper.includes('PIVOT')) {
        recommendation = 'MODIFY';
      } else if (recUpper.includes('PROCEED')) {
        recommendation = 'PROCEED';
      }
    }

    return {
      projectId,
      idea,
      problem,
      targetUsers,
      valueProposition,
      competitionAssessment,
      differentiation,
      technicalFeasibility,
      monetizationPotential,
      keyRisks,
      score,
      recommendation,
      validatedAt: new Date().toISOString(),
    };
  }

  /**
   * Executes idea validation for the given project.
   */
  async validate(
    projectId: string,
    idea: string,
    projectFolderPath: string,
    stateManager: ProjectStateManager
  ): Promise<IdeaValidationResult> {
    console.log(`[IdeaValidationAgent] Starting validation for project "${projectId}" using provider: ${this.llmProvider.name}...`);

    // 1. Update project state to IDEA_VALIDATION stage
    await stateManager.updateStatus('IN_PROGRESS');
    await stateManager.updateStage('IDEA_VALIDATION');

    // 2. Build structured validation prompt
    const systemPrompt = `You are an expert product strategist and software architect. Evaluate the proposed software product idea objectively and thoroughly.
Return a valid JSON object matching this exact schema:
{
  "problem": "Clear problem statement being solved",
  "targetUsers": ["Target user demographic 1", "Target user demographic 2"],
  "valueProposition": "Core unique value proposition",
  "competitionAssessment": "Assessment of existing market solutions and competitors",
  "differentiation": "Key competitive differentiation opportunity",
  "technicalFeasibility": "Detailed technical feasibility assessment",
  "monetizationPotential": "Monetization and business model potential",
  "keyRisks": ["Primary risk 1", "Primary risk 2", "Primary risk 3"],
  "score": 8.5,
Important: 'recommendation' must be one of strictly: "PROCEED", "MODIFY", or "REJECT".
Important: 'score' must be a number between 1.0 and 10.0.`;

    const userPrompt = `Evaluate the following software product idea: "${idea}"`;

    // 3. Request structured analysis from AIGateway
    const res = await defaultAIGateway.generate<any>({
      agent: 'IdeaValidationAgent',
      task: 'IDEA_VALIDATION',
      prompt: userPrompt,
      systemPrompt,
      projectId,
      responseFormat: 'json',
    });
    const rawAnalysis = res.output;

    // 4. Validate and sanitize response schema
    const validationResult = this.validateAndSanitizeResult(rawAnalysis, projectId, idea);

    // 5. Save validation result to idea-validation.json
    const outputFilePath = path.join(projectFolderPath, 'idea-validation.json');
    await fs.writeFile(outputFilePath, JSON.stringify(validationResult, null, 2), 'utf-8');
    console.log(`[IdeaValidationAgent] Validation report saved to: ${outputFilePath}`);

    // 6. Update project state upon completion
    await stateManager.updateStage('IDEA_VALIDATED');
    await stateManager.updateState({
      ideaValidationComplete: true,
      recommendation: validationResult.recommendation,
      score: validationResult.score,
    });

    console.log(`[IdeaValidationAgent] Validation completed successfully. Score: ${validationResult.score}/10, Recommendation: ${validationResult.recommendation}`);

    return validationResult;
  }
}
