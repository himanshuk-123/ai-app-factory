export type ErrorCategory =
  | 'RATE_LIMIT_EXCEEDED'
  | 'DAILY_QUOTA_EXHAUSTED'
  | 'SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'NETWORK_TIMEOUT'
  | 'PERMANENT_ERROR';

export interface RetryDecision {
  shouldRetry: boolean;
  category: ErrorCategory;
  delayMs: number;
  reason: string;
}

export class RetryManager {
  private maxRetries: number;

  constructor(maxRetries = 3) {
    this.maxRetries = maxRetries;
  }

  public classifyError(error: any): ErrorCategory {
    const msg = (error?.message || String(error)).toLowerCase();
    const status = error?.status || error?.statusCode || 0;

    if (msg.includes('daily quota') || msg.includes('quota_exhausted') || msg.includes('per-day')) {
      return 'DAILY_QUOTA_EXHAUSTED';
    }
    if (status === 429 || msg.includes('429') || msg.includes('rate limit') || msg.includes('resource_exhausted')) {
      return 'RATE_LIMIT_EXCEEDED';
    }
    if (status === 503 || msg.includes('503') || msg.includes('service unavailable') || msg.includes('overloaded')) {
      return 'SERVICE_UNAVAILABLE';
    }
    if (status >= 500 || msg.includes('500') || msg.includes('internal error')) {
      return 'SERVER_ERROR';
    }
    if (msg.includes('econnreset') || msg.includes('etimedout') || msg.includes('fetch failed') || msg.includes('timeout')) {
      return 'NETWORK_TIMEOUT';
    }

    return 'PERMANENT_ERROR';
  }

  public getRetryDecision(error: any, currentAttempt: number, configuredMaxRetries?: number): RetryDecision {
    const max = configuredMaxRetries ?? this.maxRetries;
    const category = this.classifyError(error);

    if (category === 'DAILY_QUOTA_EXHAUSTED' || category === 'PERMANENT_ERROR') {
      return {
        shouldRetry: false,
        category,
        delayMs: 0,
        reason: `Non-retryable error classified as ${category}`,
      };
    }

    if (currentAttempt >= max) {
      return {
        shouldRetry: false,
        category,
        delayMs: 0,
        reason: `Exceeded maximum retry limit (${max} attempts)`,
      };
    }

    // Exponential backoff with jitter (e.g. attempt 1 = 1s, attempt 2 = 2s, attempt 3 = 4s + jitter)
    const baseDelay = Math.pow(2, currentAttempt - 1) * 1000;
    const jitter = Math.floor(Math.random() * 500);
    const delayMs = Math.min(baseDelay + jitter, 15000);

    return {
      shouldRetry: true,
      category,
      delayMs,
      reason: `Transient ${category} on attempt ${currentAttempt}/${max}. Retrying in ${delayMs}ms...`,
    };
  }
}
