import fs from 'node:fs/promises';
import path from 'node:path';
import type { UsageRecord, AIUsageSummary } from './types.js';
import { globalPricingRegistry } from './pricing-registry.js';

export class UsageTracker {
  private inMemoryLogs: UsageRecord[] = [];
  private maxLogsInMemory = 500;

  public redactSecrets(input: string): string {
    if (!input) return input;
    return input
      .replace(/AIza[A-Za-z0-9_-]+/g, '[REDACTED_API_KEY]')
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/github_pat_[A-Za-z0-9_]+/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/rnd_[A-Za-z0-9]+/g, '[REDACTED_RENDER_KEY]');
  }

  public recordUsage(record: UsageRecord): void {
    // Redact sensitive secrets in error messages or prompts metadata if present
    if (record.error) {
      record.error = this.redactSecrets(record.error);
    }

    // Calculate cost using Pricing Registry
    if (record.estimatedCostUsd === undefined || record.estimatedCostUsd === null) {
      record.estimatedCostUsd = globalPricingRegistry.calculateCost(
        record.model,
        record.inputTokens,
        record.outputTokens,
        record.cachedTokens
      );
    }

    this.inMemoryLogs.unshift(record);
    if (this.inMemoryLogs.length > this.maxLogsInMemory) {
      this.inMemoryLogs.pop();
    }

    // Persist to project artifact if projectId exists
    if (record.projectId) {
      this.persistToProject(record.projectId, record).catch((err) => {
        console.warn(`[UsageTracker] Could not write to project ai-usage.json:`, err.message);
      });
    }
  }

  private async persistToProject(projectId: string, record: UsageRecord): Promise<void> {
    const projectDir = path.join(process.cwd(), 'projects', projectId);
    const usageFilePath = path.join(projectDir, 'ai-usage.json');

    try {
      await fs.mkdir(projectDir, { recursive: true });
      let existing: UsageRecord[] = [];
      try {
        const fileData = await fs.readFile(usageFilePath, 'utf-8');
        existing = JSON.parse(fileData);
      } catch {
        existing = [];
      }

      existing.push(record);
      await fs.writeFile(usageFilePath, JSON.stringify(existing, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn(`[UsageTracker] Failed writing ai-usage.json for ${projectId}:`, err.message);
    }
  }

  public getHistory(filter?: {
    agent?: string;
    model?: string;
    status?: string;
    projectId?: string;
    limit?: number;
  }): UsageRecord[] {
    let result = [...this.inMemoryLogs];

    if (filter?.agent) {
      result = result.filter((r) => r.agent.toLowerCase() === filter.agent!.toLowerCase());
    }
    if (filter?.model) {
      result = result.filter((r) => r.model.toLowerCase().includes(filter.model!.toLowerCase()));
    }
    if (filter?.status) {
      result = result.filter((r) => r.status.toLowerCase() === filter.status!.toLowerCase());
    }
    if (filter?.projectId) {
      result = result.filter((r) => r.projectId === filter.projectId);
    }

    const limit = filter?.limit || 100;
    return result.slice(0, limit);
  }

  public getUsageSummary(): AIUsageSummary {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = this.inMemoryLogs.filter((r) => r.startedAt.startsWith(today));

    let todayRequests = 0;
    let todayInputTokens = 0;
    let todayOutputTokens = 0;
    let todayCachedTokens = 0;
    let todayTotalTokens = 0;
    let todayCostSum = 0;
    let hasCostInfo = false;

    const agentMap: Record<string, { requests: number; tokens: number; percentage: number }> = {};

    for (const log of todayLogs) {
      todayRequests++;
      todayInputTokens += log.inputTokens;
      todayOutputTokens += log.outputTokens;
      todayCachedTokens += log.cachedTokens;
      todayTotalTokens += log.totalTokens;

      if (log.estimatedCostUsd !== null) {
        todayCostSum += log.estimatedCostUsd;
        hasCostInfo = true;
      }

      const agentKey = log.agent || 'UnknownAgent';
      if (!agentMap[agentKey]) {
        agentMap[agentKey] = { requests: 0, tokens: 0, percentage: 0 };
      }
      agentMap[agentKey].requests++;
      agentMap[agentKey].tokens += log.totalTokens;
    }

    // Compute agent percentages
    for (const key of Object.keys(agentMap)) {
      agentMap[key].percentage = todayTotalTokens > 0
        ? Number(((agentMap[key].tokens / todayTotalTokens) * 100).toFixed(1))
        : 0;
    }

    return {
      todayRequests,
      todayInputTokens,
      todayOutputTokens,
      todayCachedTokens,
      todayTotalTokens,
      todayEstimatedCostUsd: hasCostInfo ? Number(todayCostSum.toFixed(4)) : null,
      activeRpm: 0,
      activeTpm: 0,
      dailyUsagePercentage: null,
      status: 'HEALTHY',
      agentBreakdown: agentMap,
    };
  }
}

export const globalUsageTracker = new UsageTracker();
