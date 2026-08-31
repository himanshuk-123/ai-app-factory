import type { LLMTask } from './types.js';

export class PromptManager {
  private versions: Map<LLMTask, string> = new Map();

  constructor() {
    this.versions.set('IDEA_VALIDATION', 'v1.0.0');
    this.versions.set('MARKET_RESEARCH', 'v1.0.0');
    this.versions.set('PRODUCT_STRATEGY', 'v1.0.0');
    this.versions.set('UX_ARCHITECTURE', 'v1.0.0');
    this.versions.set('WEB_GENERATION', 'v1.0.0');
    this.versions.set('MOBILE_GENERATION', 'v1.0.0');
    this.versions.set('CODE_DEBUG', 'v1.0.0');
    this.versions.set('VISUAL_QA', 'v1.0.0');
    this.versions.set('VISUAL_AUTO_FIX', 'v1.0.0');
  }

  public getPromptVersion(task: LLMTask): string {
    return this.versions.get(task) || 'v1.0.0';
  }

  public setPromptVersion(task: LLMTask, version: string): void {
    this.versions.set(task, version);
  }
}
