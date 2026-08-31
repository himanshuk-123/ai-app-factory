import dotenv from 'dotenv';
import path from 'node:path';
import { ProjectStateManager } from '../src/orchestrator/project-state.js';
import { IdeaValidationAgent } from '../src/agents/idea-validator/idea-validator.js';
import { MarketResearchAgent } from '../src/agents/market-research/market-researcher.js';
import { ProductStrategistAgent } from '../src/agents/product-strategist/product-strategist.js';

dotenv.config();

/**
 * Manual Agent Runner Script
 * Demonstrates how to manually invoke individual agents one by one.
 */
async function runManualAgentDemo() {
  const projectId = `manual_demo_${Date.now()}`;
  const idea = 'A smart plant care reminder app that diagnoses plant diseases via photo and schedules watering.';
  const projectFolder = path.resolve(process.cwd(), 'projects', projectId);

  console.log('==================================================');
  console.log('🧪 MANUAL AGENT EXECUTION DEMO');
  console.log(`Project ID: ${projectId}`);
  console.log(`Idea: "${idea}"`);
  console.log('==================================================\n');

  // 1. Initialize State Manager
  const stateManager = new ProjectStateManager(projectFolder);
  await stateManager.createInitialState({
    id: projectId,
    idea,
    status: 'IN_PROGRESS',
    stage: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 2. Manually Run Stage 1: Idea Validation Agent
  console.log('\n--- 🎯 Running Stage 1: Idea Validation Agent ---');
  const ideaValidator = new IdeaValidationAgent();
  const validationResult = await ideaValidator.runValidation(projectId, idea, projectFolder, stateManager);
  console.log('Stage 1 Result:', JSON.stringify(validationResult, null, 2));

  // 3. Manually Run Stage 2: Market Research Agent
  console.log('\n--- 🔍 Running Stage 2: Market Research Agent ---');
  const marketResearcher = new MarketResearchAgent();
  const marketResult = await marketResearcher.runMarketResearch(projectId, idea, projectFolder, stateManager, validationResult || undefined);
  console.log('Stage 2 Result:', JSON.stringify(marketResult, null, 2));

  // 4. Manually Run Stage 3: Product Strategist Agent
  console.log('\n--- 📋 Running Stage 3: Product Strategist Agent ---');
  const productStrategist = new ProductStrategistAgent();
  const specResult = await productStrategist.runProductStrategy(projectId, idea, projectFolder, stateManager, validationResult || undefined, marketResult || undefined);
  console.log('Stage 3 Result:', JSON.stringify(specResult, null, 2));

  console.log('\n==================================================');
  console.log(`✅ MANUAL AGENT DEMO FINISHED. Files saved in: projects/${projectId}/`);
  console.log('==================================================');
}

runManualAgentDemo().catch((err) => console.error('Manual runner error:', err));
