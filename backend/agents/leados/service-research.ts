import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import { fetchRealTrends, type TrendResearchResult } from '../../../src/lib/real-trends';

const SYSTEM_PROMPT = `You are the Service Research Agent for LeadOS. Your job is to analyze REAL market data and rank the best service opportunities.

You will receive REAL live data from these sources:
- Google Trends (via SerpAPI) — real search interest scores, rising queries, timeline data
- Reddit — real post counts, engagement metrics, pain point discussions
- LinkedIn — professional demand indicators and engagement data
- Upwork — freelance job postings showing paid demand

Your job is NOT to make up data. You receive real data and must:
1. Analyze the real signals to identify the strongest service opportunities
2. Adjust scores based on the actual data quality and cross-platform validation
3. Provide reasoning that references the specific real data points
4. Rank by composite score: (demandScore * 0.4) + ((100 - competitionScore) * 0.3) + (monetizationScore * 0.3)

Return ONLY valid JSON output (no markdown, no explanation outside JSON) with this structure:
{
  "opportunities": [
    {
      "niche": "string - service niche name",
      "demandScore": "number 0-100",
      "competitionScore": "number 0-100 (lower is better)",
      "monetizationScore": "number 0-100",
      "googleTrendsScore": "number 0-100 - from real Google Trends data",
      "reasoning": "string - reference actual data points from the input",
      "estimatedMarketSize": "string",
      "targetPlatforms": ["string"],
      "risingQueries": ["string - actual breakout search terms from Google Trends data"]
    }
  ],
  "dataSourcesSummary": {
    "redditPostsAnalyzed": "number",
    "linkedinPostsAnalyzed": "number",
    "upworkJobsAnalyzed": "number",
    "googleTrendsKeywords": "number",
    "avgGoogleInterest": "number"
  },
  "reasoning": "string - overall analysis referencing real data",
  "confidence": "number 0-100"
}

Return top 5 opportunities. Base your analysis on the REAL data provided, not general knowledge.`;

export class ServiceResearchAgent extends BaseAgent {
  constructor() {
    super('service-research', 'Service Research Agent', 'Discover high-demand service opportunities via Google Trends (SerpAPI), Reddit, Hacker News, LinkedIn, Upwork');
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this.status = 'running';
    await this.log('run_started', { inputs });

    const focus = inputs.config?.focus || 'B2B services';
    const region = inputs.config?.region || 'US';

    // Step 1: Fetch REAL data from all sources
    await this.log('fetching_real_data', { focus, region, phase: 'Fetching live data from Reddit, Google Trends (SerpAPI), LinkedIn, Upwork' });

    let realData: TrendResearchResult;
    try {
      realData = await fetchRealTrends(focus, region, true); // forceRefresh=true for fresh data
      await this.log('real_data_fetched', {
        redditPosts: realData.dataSourcesSummary.reddit.postsAnalyzed,
        linkedinPosts: realData.dataSourcesSummary.linkedin.postsAnalyzed,
        upworkJobs: realData.dataSourcesSummary.upwork.jobsAnalyzed,
        googleTrendsKeywords: realData.dataSourcesSummary.googleTrends.keywordsAnalyzed,
        totalSignals: realData.dataSourcesSummary.totalSignals,
      });
    } catch (error: any) {
      await this.log('real_data_error', { error: error.message });
      // If real data fetch fails completely, fall back to mock
      this.status = 'done';
      return this.getFallbackOutput(focus);
    }

    // Step 2: Send real data to Gemini for AI-powered analysis
    try {
      await this.log('ai_analysis', { phase: 'Sending real data to AI for analysis' });

      const userMessage = JSON.stringify({
        focus,
        region,
        realData: {
          opportunities: realData.opportunities.map(opp => ({
            niche: opp.niche,
            compositeScore: opp.compositeScore,
            growthRate: opp.growthRate,
            trendData: {
              redditMentions: opp.trendData.redditMentions,
              linkedinMentions: opp.trendData.linkedinMentions,
              upworkJobs: opp.trendData.upworkJobs,
              googleTrendsScore: opp.trendData.googleTrendsScore,
              totalEngagement: opp.trendData.totalEngagement,
              googleTrends: opp.trendData.googleTrends ? {
                interestOverTime: opp.trendData.googleTrends.interestOverTime,
                risingQueries: opp.trendData.googleTrends.risingQueries,
                relatedQueries: opp.trendData.googleTrends.relatedQueries,
              } : null,
            },
            reasoning: opp.reasoning,
            estimatedMarketSize: opp.estimatedMarketSize,
            targetPlatforms: opp.targetPlatforms,
          })),
          summary: realData.dataSourcesSummary,
        },
      });

      const response = await this.callClaude(SYSTEM_PROMPT, userMessage);
      const parsed = this.safeParseLLMJson<any>(response, ['opportunities']);

      // Merge real data source summary into output
      if (!parsed.dataSourcesSummary) {
        parsed.dataSourcesSummary = {
          redditPostsAnalyzed: realData.dataSourcesSummary.reddit.postsAnalyzed,
          linkedinPostsAnalyzed: realData.dataSourcesSummary.linkedin.postsAnalyzed,
          upworkJobsAnalyzed: realData.dataSourcesSummary.upwork.jobsAnalyzed,
          googleTrendsKeywords: realData.dataSourcesSummary.googleTrends.keywordsAnalyzed,
          avgGoogleInterest: realData.dataSourcesSummary.googleTrends.avgInterest,
        };
      }

      this.status = 'done';
      await this.log('run_completed', { output: parsed });

      return {
        success: true,
        data: parsed,
        reasoning: parsed.reasoning || realData.reasoning,
        confidence: parsed.confidence || realData.confidence,
      };
    } catch (error: any) {
      await this.log('ai_analysis_fallback', { error: error.message, phase: 'Using real data directly without AI enhancement' });

      // AI failed but we have real data — return it directly
      this.status = 'done';
      return this.formatRealDataAsOutput(realData);
    }
  }

  /** Format the real trend data directly as agent output (no AI needed) */
  private formatRealDataAsOutput(realData: TrendResearchResult): AgentOutput {
    return {
      success: true,
      data: {
        opportunities: realData.opportunities.slice(0, 5).map(opp => ({
          niche: opp.niche,
          demandScore: opp.demandScore,
          competitionScore: opp.competitionScore,
          monetizationScore: opp.monetizationScore,
          googleTrendsScore: opp.trendData.googleTrendsScore,
          reasoning: opp.reasoning,
          estimatedMarketSize: opp.estimatedMarketSize,
          targetPlatforms: opp.targetPlatforms,
          risingQueries: opp.trendData.googleTrends?.risingQueries?.map(q => q.query) || [],
        })),
        dataSourcesSummary: {
          redditPostsAnalyzed: realData.dataSourcesSummary.reddit.postsAnalyzed,
          linkedinPostsAnalyzed: realData.dataSourcesSummary.linkedin.postsAnalyzed,
          upworkJobsAnalyzed: realData.dataSourcesSummary.upwork.jobsAnalyzed,
          googleTrendsKeywords: realData.dataSourcesSummary.googleTrends.keywordsAnalyzed,
          avgGoogleInterest: realData.dataSourcesSummary.googleTrends.avgInterest,
        },
      },
      reasoning: realData.reasoning,
      confidence: realData.confidence,
    };
  }

  /** Last resort fallback if even real data fetching fails */
  private getFallbackOutput(focus: string): AgentOutput {
    return {
      success: false,
      data: {
        opportunities: [],
        error: 'Failed to fetch live market data. Check API keys and network connectivity.',
      },
      reasoning: `Could not fetch real data for "${focus}". SerpAPI key may be invalid or rate-limited. Reddit API may be temporarily unavailable.`,
      confidence: 0,
      error: 'Real data fetch failed — no mock data returned. Fix the data source issue and retry.',
    };
  }
}
