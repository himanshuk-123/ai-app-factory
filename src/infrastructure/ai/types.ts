import type { LLMImageInput } from '../../tools/llm/types.js';

export type LLMTask =
  | 'IDEA_VALIDATION'
  | 'MARKET_RESEARCH'
  | 'PRODUCT_STRATEGY'
  | 'UX_ARCHITECTURE'
  | 'WEB_GENERATION'
  | 'MOBILE_GENERATION'
  | 'CODE_DEBUG'
  | 'VISUAL_QA'
  | 'VISUAL_AUTO_FIX'
  | 'GENERAL_TEXT'
  | 'GENERAL_STRUCTURED';

export interface AIGenerateRequest {
  agent: string;
  task: LLMTask;
  prompt: string;

  systemPrompt?: string;
  model?: string;

  temperature?: number;
  maxOutputTokens?: number;

  images?: LLMImageInput[];

  responseFormat?: 'json' | 'text';
  responseSchema?: unknown;

  projectId?: string;
  metadata?: Record<string, unknown>;
}

export interface AIGenerateResponse<T = unknown> {
  output: T;

  model: string;
  agent: string;
  task: LLMTask;

  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cachedTokens?: number;
  };

  durationMs: number;
  requestId: string;
  retryCount: number;

  estimatedCostUsd: number | null;
  promptVersion?: string;
  status: 'SUCCESS' | 'FAILED' | 'QUOTA_EXHAUSTED' | 'THROTTLED';
}

export interface GeminiQuotaConfig {
  rpm?: number;
  inputTpm?: number;
  rpd?: number;
}

export interface UsageRecord {
  requestId: string;
  projectId?: string;
  agent: string;
  task: LLMTask;
  model: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
  retryCount: number;
  estimatedCostUsd: number | null;
  promptVersion?: string;
  status: 'SUCCESS' | 'FAILED' | 'QUOTA_EXHAUSTED' | 'THROTTLED';
  error?: string;
}

export interface ModelPricing {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
  cachedInputPerMillionTokens?: number;
}

export interface AIConfigState {
  defaultModel: string;
  fastModel: string;
  codeModel: string;
  visionModel: string;
  maxRetries: number;
  rpmLimit: number | null;
  tpmLimit: number | null;
  rpdLimit: number | null;
}

export interface AIUsageSummary {
  todayRequests: number;
  todayInputTokens: number;
  todayOutputTokens: number;
  todayCachedTokens: number;
  todayTotalTokens: number;
  todayEstimatedCostUsd: number | null;
  activeRpm: number;
  activeTpm: number;
  dailyUsagePercentage: number | null;
  status: 'HEALTHY' | 'THROTTLED' | 'QUOTA_EXHAUSTED';
  agentBreakdown: Record<string, { requests: number; tokens: number; percentage: number }>;
}
