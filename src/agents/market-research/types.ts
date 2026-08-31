export interface CompetitorInfo {
  name: string;
  overview: string;
  keyFeatures: string[];
  pricing: string;
  complaints: string;
}

export interface SearchSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface MarketResearchResult {
  projectId: string;
  idea: string;
  targetMarket: string;
  competitors: CompetitorInfo[];
  competitorFeatures: string[];
  competitorPricing: string;
  userComplaints: string[];
  marketGaps: string[];
  differentiationOpportunities: string[];
  monetizationOpportunities: string[];
  marketRisks: string[];
  sources: SearchSource[];
  researchedAt: string;
}
