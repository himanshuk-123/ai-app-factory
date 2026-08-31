export interface LLMImageInput {
  mimeType: string;
  data: string; // Base64 encoded string
}

export interface LLMGenerateOptions {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  responseFormat?: 'json' | 'text';
  images?: LLMImageInput[];
}

export interface ILLMProvider {
  name: string;
  generateText(options: LLMGenerateOptions): Promise<string>;
  generateStructured<T>(options: LLMGenerateOptions): Promise<T>;
}

