import { GoogleGenAI } from '@google/genai';
import type { ILLMProvider, LLMGenerateOptions } from '../../tools/llm/types.js';
import { MockLLMProvider } from '../../tools/llm/mock-provider.js';
import { factoryEvents } from '../../orchestrator/event-emitter.js';

import type {
  AIGenerateRequest,
  AIGenerateResponse,
  UsageRecord,
  LLMTask,
} from './types.js';
import { ModelRouter } from './model-router.js';
import { GeminiQuotaManager } from './quota-manager.js';
import { globalUsageTracker, UsageTracker } from './usage-tracker.js';
import { RetryManager } from './retry-manager.js';
import { ContextManager } from './context-manager.js';
import { PromptManager } from './prompt-manager.js';

export class AIGateway {
  private ai: GoogleGenAI | null = null;
  private mockFallback: MockLLMProvider = new MockLLMProvider();

  public modelRouter: ModelRouter;
  public quotaManager: GeminiQuotaManager;
  public usageTracker: UsageTracker;
  public retryManager: RetryManager;
  public contextManager: ContextManager;
  public promptManager: PromptManager;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      this.ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    }

    this.modelRouter = new ModelRouter();
    this.quotaManager = new GeminiQuotaManager();
    this.usageTracker = globalUsageTracker;
    this.retryManager = new RetryManager(this.modelRouter.getConfig().maxRetries);
    this.contextManager = new ContextManager();
    this.promptManager = new PromptManager();
  }

  public isConfigured(): boolean {
    return this.ai !== null;
  }

  public async generate<T = unknown>(request: AIGenerateRequest): Promise<AIGenerateResponse<T>> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    const startedAt = new Date().toISOString();

    const selectedModel = this.modelRouter.route(request.task, request.model);
    const promptVersion = this.promptManager.getPromptVersion(request.task);

    // Prepare context
    const { systemInstruction, userPrompt } = this.contextManager.prepareStructuredPrompt(
      request.systemPrompt,
      request.prompt
    );

    const stageNumberMap: Record<LLMTask, number> = {
      IDEA_VALIDATION: 1,
      MARKET_RESEARCH: 2,
      PRODUCT_STRATEGY: 3,
      UX_ARCHITECTURE: 4,
      WEB_GENERATION: 6,
      MOBILE_GENERATION: 7,
      CODE_DEBUG: 8,
      VISUAL_QA: 11,
      VISUAL_AUTO_FIX: 12,
      GENERAL_TEXT: 0,
      GENERAL_STRUCTURED: 0,
    };
    const stageNum = stageNumberMap[request.task] || 0;

    // Emit request started event
    factoryEvents.emitWorkflowEvent({
      projectId: request.projectId || 'system',
      stage: stageNum,
      agent: request.agent,
      type: 'LOG',
      status: 'RUNNING',
      message: `[AI Gateway] ${request.agent} requested ${request.task} on model ${selectedModel} (Prompt ${promptVersion})`,
    });

    // Check Quota and throttle if necessary
    try {
      const { waitedMs } = await this.quotaManager.waitForQuota();
      if (waitedMs > 0) {
        factoryEvents.emitWorkflowEvent({
          projectId: request.projectId || 'system',
          stage: stageNum,
          agent: request.agent,
          type: 'LOG',
          status: 'RUNNING',
          message: `[AI Gateway] Quota throttling applied. Waited ${waitedMs}ms...`,
        });
      }
    } catch (quotaErr: any) {
      const durationMs = Date.now() - startTime;
      const usageRecord: UsageRecord = {
        requestId,
        projectId: request.projectId,
        agent: request.agent,
        task: request.task,
        model: selectedModel,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs,
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
        retryCount: 0,
        estimatedCostUsd: null,
        promptVersion,
        status: 'QUOTA_EXHAUSTED',
        error: quotaErr.message,
      };
      this.usageTracker.recordUsage(usageRecord);

      // Attempt mock fallback if API key missing or quota exhausted
      console.warn(`[AI Gateway] ${quotaErr.message}. Executing mock fallback...`);
      return this.executeMockFallback<T>(request, selectedModel, requestId, promptVersion, startTime);
    }

    // If Gemini client not initialized, fallback to MockLLMProvider cleanly
    if (!this.ai) {
      console.log(`[AI Gateway] GEMINI_API_KEY not configured. Executing MockLLMProvider fallback.`);
      return this.executeMockFallback<T>(request, selectedModel, requestId, promptVersion, startTime);
    }

    // Build Gemini contents (handling multimodal images)
    const contents = this.buildContents(userPrompt, request.images);

    let lastError: any = null;
    let attempt = 0;
    const maxRetries = request.metadata?.maxRetries
      ? (request.metadata.maxRetries as number)
      : this.modelRouter.getConfig().maxRetries;

    while (attempt < maxRetries) {
      attempt++;
      try {
        const isStructured = request.responseFormat === 'json' || !!request.responseSchema;

        const response = await this.ai.models.generateContent({
          model: selectedModel,
          contents,
          config: {
            systemInstruction,
            temperature: request.temperature ?? 0.2,
            maxOutputTokens: request.maxOutputTokens,
            responseMimeType: isStructured ? 'application/json' : undefined,
          },
        });

        const rawText = response.text || '';
        const usageMeta = response.usageMetadata || {};

        const inputTokens = usageMeta.promptTokenCount || Math.ceil(userPrompt.length / 4);
        const outputTokens = usageMeta.candidatesTokenCount || Math.ceil(rawText.length / 4);
        const cachedTokens = usageMeta.cachedContentTokenCount || 0;
        const totalTokens = usageMeta.totalTokenCount || inputTokens + outputTokens;

        this.quotaManager.recordRequest(inputTokens);

        let parsedOutput: T;
        if (isStructured) {
          const cleanedJson = rawText
            .trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, '')
            .trim();
          parsedOutput = JSON.parse(cleanedJson) as T;
        } else {
          parsedOutput = rawText as unknown as T;
        }

        const durationMs = Date.now() - startTime;
        const estimatedCostUsd = this.usageTracker.getUsageSummary().todayEstimatedCostUsd;

        const usageRecord: UsageRecord = {
          requestId,
          projectId: request.projectId,
          agent: request.agent,
          task: request.task,
          model: selectedModel,
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs,
          inputTokens,
          outputTokens,
          cachedTokens,
          totalTokens,
          retryCount: attempt - 1,
          estimatedCostUsd: null,
          promptVersion,
          status: 'SUCCESS',
        };
        this.usageTracker.recordUsage(usageRecord);

        factoryEvents.emitWorkflowEvent({
          projectId: request.projectId || 'system',
          stage: stageNum,
          agent: request.agent,
          type: 'LOG',
          status: 'COMPLETED',
          message: `[AI Gateway] ${request.agent} completed ${request.task} (${totalTokens} tokens, ${durationMs}ms)`,
        });

        return {
          output: parsedOutput,
          model: selectedModel,
          agent: request.agent,
          task: request.task,
          usage: {
            inputTokens,
            outputTokens,
            totalTokens,
            cachedTokens,
          },
          durationMs,
          requestId,
          retryCount: attempt - 1,
          estimatedCostUsd: usageRecord.estimatedCostUsd,
          promptVersion,
          status: 'SUCCESS',
        };
      } catch (err: any) {
        lastError = err;
        const decision = this.retryManager.getRetryDecision(err, attempt, maxRetries);

        if (decision.category === 'DAILY_QUOTA_EXHAUSTED') {
          this.quotaManager.markDailyQuotaExhausted();
        }

        if (decision.shouldRetry) {
          factoryEvents.emitWorkflowEvent({
            projectId: request.projectId || 'system',
            stage: stageNum,
            agent: request.agent,
            type: 'LOG',
            status: 'RUNNING',
            message: `[AI Gateway Retry] ${decision.reason}`,
          });
          await new Promise((res) => setTimeout(res, decision.delayMs));
        } else {
          break;
        }
      }
    }

    // Out of retries or non-retryable error -> Record failure & execute mock fallback if safe
    const durationMs = Date.now() - startTime;
    const usageRecord: UsageRecord = {
      requestId,
      projectId: request.projectId,
      agent: request.agent,
      task: request.task,
      model: selectedModel,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs,
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
      retryCount: attempt - 1,
      estimatedCostUsd: null,
      promptVersion,
      status: 'FAILED',
      error: lastError?.message || String(lastError),
    };
    this.usageTracker.recordUsage(usageRecord);

    console.warn(`[AI Gateway] ${request.agent} (${request.task}) failed after ${attempt} attempts: ${lastError?.message}. Falling back to MockLLMProvider.`);
    return this.executeMockFallback<T>(request, selectedModel, requestId, promptVersion, startTime);
  }

  private buildContents(userPrompt: string, images?: AIGenerateRequest['images']): any {
    if (!images || images.length === 0) {
      return userPrompt;
    }

    const parts: any[] = [{ text: userPrompt }];
    for (const img of images) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data,
        },
      });
    }
    return parts;
  }

  private async executeMockFallback<T>(
    request: AIGenerateRequest,
    model: string,
    requestId: string,
    promptVersion: string,
    startTime: number
  ): Promise<AIGenerateResponse<T>> {
    const isStructured = request.responseFormat === 'json' || !!request.responseSchema;
    const opts: LLMGenerateOptions = {
      systemPrompt: request.systemPrompt,
      userPrompt: request.prompt,
      images: request.images,
    };

    let output: T;
    if (isStructured) {
      output = await this.mockFallback.generateStructured<T>(opts);
    } else {
      output = (await this.mockFallback.generateText(opts)) as unknown as T;
    }

    const durationMs = Date.now() - startTime;
    return {
      output,
      model: `${model}-mock-fallback`,
      agent: request.agent,
      task: request.task,
      usage: {
        inputTokens: Math.ceil(request.prompt.length / 4),
        outputTokens: 500,
        totalTokens: Math.ceil(request.prompt.length / 4) + 500,
        cachedTokens: 0,
      },
      durationMs,
      requestId,
      retryCount: 0,
      estimatedCostUsd: 0,
      promptVersion,
      status: 'SUCCESS',
    };
  }
}

export const defaultAIGateway = new AIGateway();
