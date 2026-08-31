import type { GeminiQuotaConfig } from './types.js';

interface RequestTimestamp {
  timestamp: number;
  inputTokens: number;
}

export class GeminiQuotaManager {
  private rpmLimit: number | null = null;
  private tpmLimit: number | null = null;
  private rpdLimit: number | null = null;

  private requestWindow: RequestTimestamp[] = [];
  private dailyRequestsCount = 0;
  private dailyWindowStart: number = Date.now();
  private dailyQuotaExhausted = false;

  constructor(config?: GeminiQuotaConfig) {
    if (config) {
      this.rpmLimit = config.rpm ?? null;
      this.tpmLimit = config.inputTpm ?? null;
      this.rpdLimit = config.rpd ?? null;
    } else {
      this.rpmLimit = process.env.GEMINI_RPM_LIMIT ? parseInt(process.env.GEMINI_RPM_LIMIT, 10) : null;
      this.tpmLimit = process.env.GEMINI_INPUT_TPM_LIMIT ? parseInt(process.env.GEMINI_INPUT_TPM_LIMIT, 10) : null;
      this.rpdLimit = process.env.GEMINI_RPD_LIMIT ? parseInt(process.env.GEMINI_RPD_LIMIT, 10) : null;
    }
  }

  public updateQuotaConfig(config: GeminiQuotaConfig): void {
    if (config.rpm !== undefined) this.rpmLimit = config.rpm;
    if (config.inputTpm !== undefined) this.tpmLimit = config.inputTpm;
    if (config.rpd !== undefined) this.rpdLimit = config.rpd;
  }

  public getQuotaState() {
    this.cleanSlidingWindow();
    const now = Date.now();
    const activeRequests = this.requestWindow.length;
    const activeTokens = this.requestWindow.reduce((acc, r) => acc + r.inputTokens, 0);

    return {
      rpmLimit: this.rpmLimit,
      tpmLimit: this.tpmLimit,
      rpdLimit: this.rpdLimit,
      activeRpm: activeRequests,
      activeTpm: activeTokens,
      dailyRequestsCount: this.dailyRequestsCount,
      isDailyQuotaExhausted: this.dailyQuotaExhausted,
      status: this.dailyQuotaExhausted
        ? ('QUOTA_EXHAUSTED' as const)
        : (this.rpmLimit && activeRequests >= this.rpmLimit) || (this.tpmLimit && activeTokens >= this.tpmLimit)
        ? ('THROTTLED' as const)
        : ('HEALTHY' as const),
    };
  }

  public markDailyQuotaExhausted(): void {
    this.dailyQuotaExhausted = true;
  }

  public resetDailyQuota(): void {
    this.dailyQuotaExhausted = false;
    this.dailyRequestsCount = 0;
    this.dailyWindowStart = Date.now();
  }

  private cleanSlidingWindow(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    this.requestWindow = this.requestWindow.filter((r) => r.timestamp >= oneMinuteAgo);

    // Reset daily counter after 24 hours
    if (now - this.dailyWindowStart > 86_400_000) {
      this.resetDailyQuota();
    }
  }

  public async waitForQuota(estimatedInputTokens = 1000): Promise<{ waitedMs: number }> {
    if (this.dailyQuotaExhausted) {
      throw new Error('Daily Gemini API quota exhausted. Execution paused to prevent persistent failures.');
    }

    let waitedMs = 0;

    while (true) {
      this.cleanSlidingWindow();
      const now = Date.now();

      const currentRPM = this.requestWindow.length;
      const currentTPM = this.requestWindow.reduce((acc, r) => acc + r.inputTokens, 0);

      const rpmExceeded = this.rpmLimit !== null && currentRPM >= this.rpmLimit;
      const tpmExceeded = this.tpmLimit !== null && currentTPM + estimatedInputTokens > this.tpmLimit;
      const rpdExceeded = this.rpdLimit !== null && this.dailyRequestsCount >= this.rpdLimit;

      if (rpdExceeded) {
        this.markDailyQuotaExhausted();
        throw new Error(`Configured Daily Request Limit (${this.rpdLimit} RPD) reached.`);
      }

      if (!rpmExceeded && !tpmExceeded) {
        // Capacity available
        break;
      }

      // Need to throttle: sleep 500ms and re-check
      const delay = 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
      waitedMs += delay;

      if (waitedMs > 60_000) {
        throw new Error('Quota wait timeout exceeded 60 seconds.');
      }
    }

    return { waitedMs };
  }

  public recordRequest(inputTokens: number): void {
    this.cleanSlidingWindow();
    this.requestWindow.push({
      timestamp: Date.now(),
      inputTokens,
    });
    this.dailyRequestsCount++;
  }
}
