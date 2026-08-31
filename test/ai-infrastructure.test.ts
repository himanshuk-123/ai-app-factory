import { ModelRouter } from '../src/infrastructure/ai/model-router.js';
import { GeminiQuotaManager } from '../src/infrastructure/ai/quota-manager.js';
import { RetryManager } from '../src/infrastructure/ai/retry-manager.js';
import { UsageTracker } from '../src/infrastructure/ai/usage-tracker.js';
import { ContextManager } from '../src/infrastructure/ai/context-manager.js';
import { AIGateway } from '../src/infrastructure/ai/ai-gateway.js';
import { globalPricingRegistry } from '../src/infrastructure/ai/pricing-registry.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASSED: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n==================================================');
  console.log('🧪 AI INFRASTRUCTURE UNIT & INTEGRATION SUITE');
  console.log('==================================================\n');

  // 1. Test ModelRouter
  console.log('--- 1. ModelRouter Tests ---');
  const router = new ModelRouter();
  assert(router.route('IDEA_VALIDATION') === 'gemini-3.6-flash', 'Routes IDEA_VALIDATION to fast model');
  assert(router.route('WEB_GENERATION') === 'gemini-3.6-flash', 'Routes WEB_GENERATION to code model');
  assert(router.route('VISUAL_QA') === 'gemini-3.6-flash', 'Routes VISUAL_QA to vision model');
  assert(router.route('GENERAL_TEXT', 'custom-model') === 'custom-model', 'Respects explicitly requested model override');

  // 2. Test QuotaManager
  console.log('\n--- 2. QuotaManager Throttling Tests ---');
  const quota = new GeminiQuotaManager({ rpm: 2, inputTpm: 1000, rpd: 10 });
  const initial = quota.getQuotaState();
  assert(initial.status === 'HEALTHY', 'Initial quota status is HEALTHY');

  quota.recordRequest(500);
  quota.recordRequest(400);
  const throttled = quota.getQuotaState();
  assert(throttled.status === 'THROTTLED', 'Throttles when RPM limit is reached');

  // 3. Test RetryManager
  console.log('\n--- 3. RetryManager Backoff Tests ---');
  const retry = new RetryManager(3);
  const rateLimitDecision = retry.getRetryDecision(new Error('429 rate limit exceeded'), 1);
  assert(rateLimitDecision.shouldRetry === true, 'Retries transient 429 rate limits');
  assert(rateLimitDecision.delayMs > 0, 'Applies positive exponential delay');

  const quotaExhaustedDecision = retry.getRetryDecision(new Error('daily quota_exhausted'), 1);
  assert(quotaExhaustedDecision.shouldRetry === false, 'Stops retrying permanent daily quota exhaustion');

  const maxRetryDecision = retry.getRetryDecision(new Error('500 internal server error'), 3, 3);
  assert(maxRetryDecision.shouldRetry === false, 'Enforces max retries cap');

  // 4. Test UsageTracker & Secret Redaction
  console.log('\n--- 4. UsageTracker & Secret Redaction Tests ---');
  const tracker = new UsageTracker();
  const rawSecretMsg = 'Error with API Key AIzaSyD123456789012345678901234567890 and Bearer github_pat_123456';
  const redacted = tracker.redactSecrets(rawSecretMsg);
  assert(!redacted.includes('AIzaSyD'), 'Redacts Gemini API Keys from telemetry errors');
  assert(!redacted.includes('github_pat_'), 'Redacts GitHub tokens from telemetry errors');

  // 5. Test PricingRegistry Cost Calculation
  console.log('\n--- 5. PricingRegistry Cost Tests ---');
  const cost = globalPricingRegistry.calculateCost('gemini-3.6-flash', 10000, 2000, 1000);
  assert(cost !== null && cost > 0, 'Calculates non-zero cost for known model');

  // 6. Test ContextManager
  console.log('\n--- 6. ContextManager Formatting Tests ---');
  const contextMgr = new ContextManager();
  const promptData = contextMgr.prepareStructuredPrompt('Base System', 'User Prompt', 'Common Specs');
  assert(promptData.systemInstruction?.includes('Common Specs') ?? false, 'Appends common context to system prompt');

  // 7. Test AIGateway Execution & Mock Fallback
  console.log('\n--- 7. AIGateway Resilient Mock Fallback Tests ---');
  const gateway = new AIGateway();
  const response = await gateway.generate<{ test: string }>({
    agent: 'TestAgent',
    task: 'IDEA_VALIDATION',
    prompt: 'Return JSON: {"test": "ok"}',
    responseFormat: 'json',
  });
  assert(response.output !== null, 'AIGateway returns valid output');
  assert(response.status === 'SUCCESS', 'AIGateway status is SUCCESS');

  console.log('\n==================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite runner error:', err);
  process.exit(1);
});
