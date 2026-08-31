import { GoogleGenAI } from '@google/genai';
import type { ILLMProvider, LLMGenerateOptions } from './types.js';
import { MockLLMProvider } from './mock-provider.js';

export class GeminiLLMProvider implements ILLMProvider {
  name = 'GeminiLLMProvider';
  private ai: GoogleGenAI;
  private primaryModel = 'gemini-3.6-flash';
  private mockFallback = new MockLLMProvider();

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is missing from environment variables.');
    }
    this.ai = new GoogleGenAI({ apiKey: key });
  }

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildContents(options: LLMGenerateOptions): any {
    if (!options.images || options.images.length === 0) {
      return options.userPrompt;
    }

    const parts: any[] = [{ text: options.userPrompt }];
    for (const img of options.images) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data,
        },
      });
    }
    return parts;
  }

  async generateText(options: LLMGenerateOptions): Promise<string> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await this.ai.models.generateContent({
          model: this.primaryModel,
          contents: this.buildContents(options),
          config: {
            systemInstruction: options.systemPrompt,
            temperature: options.temperature ?? 0.2,
          },
        });

        if (response.text) {
          return response.text;
        }
      } catch (error: any) {
        lastError = error as Error;
        const msg = error?.message || String(error);
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('rate-limit') || msg.includes('quota')) {
          console.warn(`[GeminiLLMProvider] Rate limit hit on ${this.primaryModel} (attempt ${attempt}/2). Pausing 2s...`);
          await this.sleep(2000);
        } else {
          break;
        }
      }
    }

    console.warn(`[GeminiLLMProvider] Gemini API quota limit reached. Falling back to MockLLMProvider for resilient execution.`);
    return this.mockFallback.generateText(options);
  }

  async generateStructured<T>(options: LLMGenerateOptions): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await this.ai.models.generateContent({
          model: this.primaryModel,
          contents: this.buildContents(options),
          config: {
            systemInstruction: options.systemPrompt,
            temperature: options.temperature ?? 0.2,
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text;
        if (!rawText) {
          throw new Error('Empty response text returned from Gemini API.');
        }

        const cleanedJson = rawText
          .trim()
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/, '')
          .trim();

        const parsed = JSON.parse(cleanedJson);
        return parsed as T;
      } catch (error: any) {
        lastError = error as Error;
        const msg = error?.message || String(error);
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('rate-limit') || msg.includes('quota')) {
          console.warn(`[GeminiLLMProvider] Rate limit hit on ${this.primaryModel} (attempt ${attempt}/2). Pausing 2s...`);
          await this.sleep(2000);
        } else {
          break;
        }
      }
    }

    console.warn(`[GeminiLLMProvider] Gemini API quota limit reached. Falling back to MockLLMProvider for resilient execution.`);
    return this.mockFallback.generateStructured<T>(options);
  }
}
