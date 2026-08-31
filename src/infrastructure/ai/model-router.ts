import type { LLMTask, AIConfigState } from './types.js';

export class ModelRouter {
  private config: AIConfigState;

  constructor() {
    this.config = {
      defaultModel: process.env.GEMINI_DEFAULT_MODEL || 'gemini-3.6-flash',
      fastModel: process.env.GEMINI_FAST_MODEL || 'gemini-3.6-flash',
      codeModel: process.env.GEMINI_CODE_MODEL || 'gemini-3.6-flash',
      visionModel: process.env.GEMINI_VISION_MODEL || 'gemini-3.6-flash',
      maxRetries: process.env.GEMINI_MAX_RETRIES ? parseInt(process.env.GEMINI_MAX_RETRIES, 10) : 3,
      rpmLimit: process.env.GEMINI_RPM_LIMIT ? parseInt(process.env.GEMINI_RPM_LIMIT, 10) : null,
      tpmLimit: process.env.GEMINI_INPUT_TPM_LIMIT ? parseInt(process.env.GEMINI_INPUT_TPM_LIMIT, 10) : null,
      rpdLimit: process.env.GEMINI_RPD_LIMIT ? parseInt(process.env.GEMINI_RPD_LIMIT, 10) : null,
    };
  }

  public getConfig(): AIConfigState {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<AIConfigState>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  public route(task: LLMTask, requestedModel?: string): string {
    if (requestedModel && requestedModel.trim().length > 0) {
      return requestedModel.trim();
    }

    switch (task) {
      case 'IDEA_VALIDATION':
        return this.config.fastModel;

      case 'MARKET_RESEARCH':
      case 'PRODUCT_STRATEGY':
      case 'UX_ARCHITECTURE':
        return this.config.defaultModel;

      case 'WEB_GENERATION':
      case 'MOBILE_GENERATION':
      case 'CODE_DEBUG':
      case 'VISUAL_AUTO_FIX':
        return this.config.codeModel;

      case 'VISUAL_QA':
        return this.config.visionModel;

      default:
        return this.config.defaultModel;
    }
  }
}
