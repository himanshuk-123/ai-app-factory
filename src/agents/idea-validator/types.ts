export type Recommendation = 'PROCEED' | 'MODIFY' | 'REJECT';

export interface IdeaValidationResult {
  projectId: string;
  idea: string;
  problem: string;
  targetUsers: string[];
  valueProposition: string;
  competitionAssessment: string;
  differentiation: string;
  technicalFeasibility: string;
  monetizationPotential: string;
  keyRisks: string[];
  score: number;
  recommendation: Recommendation;
  validatedAt: string;
}
