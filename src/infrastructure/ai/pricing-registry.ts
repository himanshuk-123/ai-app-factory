import type { ModelPricing } from './types.js';

export class ModelPricingRegistry {
  private registry: Map<string, ModelPricing> = new Map();

  constructor() {
    // Register Gemini 1.5 & 3.6 known pricing baselines (per 1M tokens)
    this.register('gemini-3.6-flash', {
      inputPerMillionTokens: 0.075,
      outputPerMillionTokens: 0.30,
      cachedInputPerMillionTokens: 0.01875,
    });
    this.register('gemini-1.5-flash', {
      inputPerMillionTokens: 0.075,
      outputPerMillionTokens: 0.30,
      cachedInputPerMillionTokens: 0.01875,
    });
    this.register('gemini-1.5-pro', {
      inputPerMillionTokens: 1.25,
      outputPerMillionTokens: 5.00,
      cachedInputPerMillionTokens: 0.3125,
    });
    this.register('gemini-2.0-flash', {
      inputPerMillionTokens: 0.10,
      outputPerMillionTokens: 0.40,
      cachedInputPerMillionTokens: 0.025,
    });
  }

  public register(modelName: string, pricing: ModelPricing): void {
    this.registry.set(modelName.toLowerCase(), pricing);
  }

  public getPricing(modelName: string): ModelPricing | null {
    const key = modelName.toLowerCase();
    for (const [registeredModel, pricing] of this.registry.entries()) {
      if (key.includes(registeredModel) || registeredModel.includes(key)) {
        return pricing;
      }
    }
    return null;
  }

  public calculateCost(
    modelName: string,
    inputTokens: number,
    outputTokens: number,
    cachedTokens = 0
  ): number | null {
    const pricing = this.getPricing(modelName);
    if (!pricing) {
      return null;
    }

    const nonCachedInput = Math.max(0, inputTokens - cachedTokens);
    const cachedCost = (cachedTokens / 1_000_000) * (pricing.cachedInputPerMillionTokens ?? (pricing.inputPerMillionTokens * 0.25));
    const inputCost = (nonCachedInput / 1_000_000) * pricing.inputPerMillionTokens;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillionTokens;

    return Number((inputCost + cachedCost + outputCost).toFixed(6));
  }
}

export const globalPricingRegistry = new ModelPricingRegistry();
