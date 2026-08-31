import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectStateManager } from '../../orchestrator/project-state.js';
import { getLLMProvider, type ILLMProvider } from '../../tools/llm/index.js';
import { defaultAIGateway } from '../../infrastructure/ai/ai-gateway.js';
import { getWebSearchProvider, type IWebSearchProvider, type SearchResultItem } from '../../tools/search/index.js';
import type { IdeaValidationResult } from '../idea-validator/types.js';
import type { CompetitorInfo, MarketResearchResult, SearchSource } from './types.js';

export class MarketResearchAgent {
  private llmProvider: ILLMProvider;
  private searchProvider: IWebSearchProvider;

  constructor(llmProvider?: ILLMProvider, searchProvider?: IWebSearchProvider) {
    this.llmProvider = llmProvider || getLLMProvider();
    this.searchProvider = searchProvider || getWebSearchProvider();
  }

  /**
   * Validates and sanitizes LLM output into MarketResearchResult.
   */
  private validateAndSanitizeResult(
    raw: any,
    projectId: string,
    idea: string,
    sources: SearchSource[]
  ): MarketResearchResult {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid AI output for Market Research: Expected JSON object.');
    }

    const targetMarket =
      typeof raw.targetMarket === 'string' && raw.targetMarket.trim()
        ? raw.targetMarket.trim()
        : 'Target market not specified.';

    const competitors: CompetitorInfo[] = Array.isArray(raw.competitors)
      ? raw.competitors.map((c: any) => ({
          name: typeof c.name === 'string' ? c.name.trim() : 'Unknown Competitor',
          overview: typeof c.overview === 'string' ? c.overview.trim() : '',
          keyFeatures: Array.isArray(c.keyFeatures) ? c.keyFeatures.map((f: any) => String(f).trim()) : [],
          pricing: typeof c.pricing === 'string' ? c.pricing.trim() : 'Free / Paid tiers available',
          complaints: typeof c.complaints === 'string' ? c.complaints.trim() : 'Common user complaints noted in market reviews.',
        }))
      : [];

    const competitorFeatures = Array.isArray(raw.competitorFeatures)
      ? raw.competitorFeatures.map((f: any) => String(f).trim()).filter(Boolean)
      : [];

    const competitorPricing =
      typeof raw.competitorPricing === 'string' && raw.competitorPricing.trim()
        ? raw.competitorPricing.trim()
        : 'Freemium and monthly subscription models dominate.';

    const userComplaints = Array.isArray(raw.userComplaints)
      ? raw.userComplaints.map((c: any) => String(c).trim()).filter(Boolean)
      : [];

    const marketGaps = Array.isArray(raw.marketGaps)
      ? raw.marketGaps.map((g: any) => String(g).trim()).filter(Boolean)
      : [];

    const differentiationOpportunities = Array.isArray(raw.differentiationOpportunities)
      ? raw.differentiationOpportunities.map((d: any) => String(d).trim()).filter(Boolean)
      : [];

    const monetizationOpportunities = Array.isArray(raw.monetizationOpportunities)
      ? raw.monetizationOpportunities.map((m: any) => String(m).trim()).filter(Boolean)
      : [];

    const marketRisks = Array.isArray(raw.marketRisks)
      ? raw.marketRisks.map((r: any) => String(r).trim()).filter(Boolean)
      : [];

    return {
      projectId,
      idea,
      targetMarket,
      competitors,
      competitorFeatures,
      competitorPricing,
      userComplaints,
      marketGaps,
      differentiationOpportunities,
      monetizationOpportunities,
      marketRisks,
      sources,
      researchedAt: new Date().toISOString(),
    };
  }

  /**
   * Executes Market Research for the project using live web search data.
   */
  async research(
    projectId: string,
    idea: string,
    projectFolderPath: string,
    stateManager: ProjectStateManager,
    ideaValidationResult?: IdeaValidationResult
  ): Promise<MarketResearchResult | null> {
    // 1. Guard check: If Idea Validation returned REJECT, do not proceed with Market Research
    if (ideaValidationResult?.recommendation === 'REJECT') {
      console.log(`[MarketResearchAgent] Skipping Market Research because Idea Validation recommendation is "REJECT".`);
      await stateManager.updateState({
        marketResearchSkipped: true,
        skipReason: 'Idea Validation rejected the product idea.',
      });
      return null;
    }

    console.log(`[MarketResearchAgent] Starting market research for project "${projectId}"...`);

    // 2. Update state to MARKET_RESEARCH stage
    await stateManager.updateStatus('IN_PROGRESS');
    await stateManager.updateStage('MARKET_RESEARCH');

    // 3. Perform live web search using search provider
    console.log(`[MarketResearchAgent] Performing live web search using provider: ${this.searchProvider.name}...`);
    const query1 = `${idea} top apps competitors reviews`;
    const query2 = `${idea} pricing user complaints alternative`;

    const searchResults1 = await this.searchProvider.search(query1, 6);
    const searchResults2 = await this.searchProvider.search(query2, 6);

    // Combine & deduplicate sources by URL
    const sourceMap = new Map<string, SearchResultItem>();
    [...searchResults1, ...searchResults2].forEach((item) => {
      if (item.url && !sourceMap.has(item.url)) {
        sourceMap.set(item.url, item);
      }
    });

    const searchSources: SearchSource[] = Array.from(sourceMap.values()).map((s) => ({
      title: s.title,
      url: s.url,
      snippet: s.snippet,
    }));

    console.log(`[MarketResearchAgent] Gathered ${searchSources.length} live web sources.`);

    // 4. Construct prompt containing real web search context
    const searchContextStr = searchSources
      .map((s, idx) => `[Source ${idx + 1}] Title: ${s.title}\nURL: ${s.url}\nSnippet: ${s.snippet}`)
      .join('\n\n');

    const systemPrompt = `You are a principal market analyst and competitive strategist.
Analyze the provided live web search results and extract actionable, highly structured market intelligence for the proposed software idea.
Return a valid JSON object matching this exact schema:
{
  "targetMarket": "Detailed target market overview and scope",
  "competitors": [
    {
      "name": "Competitor Name",
      "overview": "Overview of competitor",
      "keyFeatures": ["Feature 1", "Feature 2"],
      "pricing": "Pricing tiers and model",
      "complaints": "Common user complaints / pain points"
    }
  ],
  "competitorFeatures": ["Common competitor feature 1", "Common competitor feature 2"],
  "competitorPricing": "Pricing landscape analysis",
  "userComplaints": ["User complaint 1", "User complaint 2"],
  "marketGaps": ["Market gap 1", "Market gap 2"],
  "differentiationOpportunities": ["Differentiation opportunity 1", "Differentiation opportunity 2"],
  "monetizationOpportunities": ["Monetization model 1", "Monetization model 2"],
  "marketRisks": ["Market risk 1", "Market risk 2"]
}`;

    const userPrompt = `App Idea: "${idea}"

Problem Statement & Context: ${ideaValidationResult?.problem || 'Solve key user pain points'}

Live Web Search Context:
${searchContextStr || 'No live web search context retrieved.'}`;

    // 5. Query AIGateway to synthesize market research
    const res = await defaultAIGateway.generate<any>({
      agent: 'MarketResearchAgent',
      task: 'MARKET_RESEARCH',
      prompt: userPrompt,
      systemPrompt,
      projectId,
      responseFormat: 'json',
    });
    const rawAnalysis = res.output;

    // 6. Validate & sanitize result with actual sources attached
    const researchResult = this.validateAndSanitizeResult(rawAnalysis, projectId, idea, searchSources);

    // 7. Save output to projects/<projectId>/market-research.json
    const outputFilePath = path.join(projectFolderPath, 'market-research.json');
    await fs.writeFile(outputFilePath, JSON.stringify(researchResult, null, 2), 'utf-8');
    console.log(`[MarketResearchAgent] Market research report saved to: ${outputFilePath}`);

    // 8. Update project state
    await stateManager.updateStage('MARKET_RESEARCH_COMPLETED');
    await stateManager.updateState({
      marketResearchComplete: true,
      sourcesCount: searchSources.length,
      competitorsIdentified: researchResult.competitors.length,
    });

    console.log(`[MarketResearchAgent] Market research completed successfully. Competitors analyzed: ${researchResult.competitors.length}, Sources: ${searchSources.length}`);

    return researchResult;
  }
}
