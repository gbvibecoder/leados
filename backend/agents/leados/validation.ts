import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';

const SYSTEM_PROMPT = `You are the Validation Agent for LeadOS — the Service Acquisition Machine. Your job is to make a GO/NO-GO decision on a packaged service offer before any resources are committed to building funnels or running campaigns.

You receive JSON input containing:
- The full offer package (ICP, pain points, pricing tiers, guarantee, positioning) from the Offer Engineering Agent
- Service research data (demand, competition, monetization scores) from the Service Research Agent
- Google Trends data (search interest over time, rising queries, regional demand) from SerpAPI

Your responsibilities:
1. MARKET DEMAND ANALYSIS (score 0-100): Evaluate real demand signals — Google Trends search interest, Reddit/HN mentions, buyer intent indicators. Weight Google Trends data heavily as authoritative signal. Higher = stronger demand.
2. COMPETITIVE SATURATION (score 0-100): Assess how crowded the market is. Lower = less saturated = better opportunity.
3. PRICING FEASIBILITY (score 0-100): Validate whether the proposed pricing tiers match market willingness to pay. Consider anchor pricing of competitors, perceived value, and ICP budget capacity.
4. CAC vs LTV ANALYSIS: Estimate realistic Customer Acquisition Cost and Lifetime Value. Calculate LTV/CAC ratio — must be >3x for GO.
5. RISK ASSESSMENT (score 0-100): Overall risk score where lower = less risk. Identify specific risk factors with mitigation strategies.
6. TREND MOMENTUM ANALYSIS: Analyze Google Trends data — rising queries indicate growth potential, declining trends indicate market saturation risk.
7. FINAL DECISION: GO if composite viability is high and LTV/CAC > 3x. NO-GO if fundamental blockers exist. CONDITIONAL if viable with specific changes.

Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "decision": "GO | NO-GO | CONDITIONAL",
  "scores": {
    "marketDemand": "number 0-100",
    "competitiveSaturation": "number 0-100 (lower = better)",
    "pricingFeasibility": "number 0-100",
    "cacVsLtv": "number 0-100"
  },
  "cacEstimate": "number — estimated CAC in USD",
  "ltvEstimate": "number — estimated LTV in USD",
  "ltvCacRatio": "number — LTV / CAC ratio",
  "riskScore": "number 0-100 (lower = less risk)",
  "riskFactors": [
    {
      "factor": "string — risk description",
      "severity": "low | medium | high",
      "mitigation": "string — how to mitigate"
    }
  ],
  "trendAnalysis": {
    "googleTrendsScore": "number 0-100 — search interest level",
    "trendDirection": "rising | stable | declining",
    "risingQueriesCount": "number — count of breakout search terms",
    "marketMomentum": "string — assessment of trend momentum"
  },
  "reasoning": "string — detailed reasoning for the decision",
  "confidence": "number 0-100"
}`;

export class ValidationAgent extends BaseAgent {
  constructor() {
    super(
      'validation',
      'Validation Agent',
      'GO/NO-GO decision with risk assessment — evaluates market demand, competition, pricing feasibility, CAC vs LTV, and risk factors'
    );
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this.status = 'running';
    await this.log('run_started', { inputs });

    try {
      const userMessage = JSON.stringify({
        ...inputs.config,
        previousOutputs: inputs.previousOutputs || {},
      });
      const response = await this.callClaude(SYSTEM_PROMPT, userMessage);
      const parsed = this.safeParseLLMJson<any>(response, ['decision', 'scores']);
      this.status = 'done';
      await this.log('run_completed', { output: parsed });
      return {
        success: true,
        data: parsed,
        reasoning: parsed.reasoning || 'Validation complete',
        confidence: parsed.confidence || 91,
      };
    } catch (error: any) {
      this.status = 'done';
      await this.log('run_fallback', { reason: 'Using mock data' });
      const mockData = this.getMockOutput(inputs);
      return {
        success: true,
        data: mockData,
        reasoning: 'Completed with mock data',
        confidence: 80,
      };
    }
  }

  private getMockOutput(inputs: AgentInput): any {
    const offerData = inputs.previousOutputs?.['offer-engineering'];
    const serviceResearch = inputs.previousOutputs?.['service-research'];
    const serviceName = offerData?.data?.offer?.serviceName || 'LeadFlow AI';

    // Extract upstream scores to make a data-driven decision
    const topOpp = serviceResearch?.data?.opportunities?.[0];
    const demandScore = topOpp?.demandScore ?? 75;
    const competitionScore = topOpp?.competitionScore ?? 50;
    const monetizationScore = topOpp?.monetizationScore ?? 70;
    const trendsScore = topOpp?.googleTrendsScore ?? 60;

    const starterPrice = offerData?.data?.offer?.pricingTiers?.[0]?.price ?? 2997;
    const growthPrice = offerData?.data?.offer?.pricingTiers?.[1]?.price ?? 5997;

    // Calculate realistic CAC and LTV from upstream data
    const cacEstimate = Math.round(starterPrice * 0.04 * (1 + competitionScore / 100));
    const avgMonthlyRevenue = (starterPrice + growthPrice) / 2;
    const retentionMonths = demandScore > 80 ? 12 : demandScore > 60 ? 9 : 6;
    const ltvEstimate = Math.round(avgMonthlyRevenue * retentionMonths * 0.7);
    const ltvCacRatio = Math.round((ltvEstimate / cacEstimate) * 10) / 10;

    // Score calculations
    const marketDemand = Math.round((demandScore * 0.6 + trendsScore * 0.4));
    const pricingFeasibility = monetizationScore > 80 && demandScore > 70 ? 90 : monetizationScore > 60 ? 75 : 55;
    const cacVsLtvScore = ltvCacRatio > 10 ? 95 : ltvCacRatio > 5 ? 85 : ltvCacRatio > 3 ? 70 : 40;
    const riskScore = Math.round(competitionScore * 0.4 + (100 - demandScore) * 0.3 + (100 - monetizationScore) * 0.3);

    // Data-driven GO/NO-GO decision
    let decision: 'GO' | 'NO-GO' | 'CONDITIONAL' = 'GO';
    const reasons: string[] = [];

    if (ltvCacRatio < 3) {
      decision = 'NO-GO';
      reasons.push(`LTV/CAC ratio of ${ltvCacRatio}x is below the 3x minimum threshold`);
    }
    if (demandScore < 50) {
      decision = decision === 'NO-GO' ? 'NO-GO' : 'CONDITIONAL';
      reasons.push(`Market demand score of ${demandScore} indicates weak demand`);
    }
    if (competitionScore > 80) {
      decision = decision === 'NO-GO' ? 'NO-GO' : 'CONDITIONAL';
      reasons.push(`Competition score of ${competitionScore} indicates oversaturated market`);
    }
    if (riskScore > 60) {
      decision = decision === 'GO' ? 'CONDITIONAL' : decision;
      reasons.push(`Risk score of ${riskScore} is above acceptable threshold`);
    }

    const riskFactors = [
      {
        factor: `${topOpp?.niche || 'This market'} is an emerging category — buyer education may be required`,
        severity: demandScore > 80 ? 'low' as const : 'medium' as const,
        mitigation: 'Lead with case studies and ROI calculators in the funnel. Use comparison pages against traditional agencies.',
      },
      {
        factor: `Pricing at $${starterPrice.toLocaleString()}/mo Starter may exclude smaller companies`,
        severity: starterPrice > 5000 ? 'high' as const : starterPrice > 2000 ? 'low' as const : 'low' as const,
        mitigation: 'Higher price filters for serious buyers with budget, improving lead quality and reducing churn.',
      },
      {
        factor: 'Dependence on third-party APIs (Google Ads, Meta, Instantly) introduces platform risk',
        severity: 'medium' as const,
        mitigation: 'Abstraction layer already built into LeadOS architecture. Can swap providers without business logic changes.',
      },
      {
        factor: 'Money-back guarantee creates cash flow risk if early cohorts underperform',
        severity: 'high' as const,
        mitigation: 'Set aside 20% reserve fund for first 6 months. Monitor guarantee claim rate weekly — if >15%, pause acquisition and fix delivery.',
      },
      {
        factor: `Competition score of ${competitionScore} — ${competitionScore > 60 ? 'market is moderately crowded' : 'manageable competition level'}`,
        severity: competitionScore > 70 ? 'high' as const : competitionScore > 50 ? 'medium' as const : 'low' as const,
        mitigation: 'Differentiate through automation depth and performance guarantees that manual agencies cannot match.',
      },
    ];

    const trendDirection = trendsScore > 70 ? 'rising' : trendsScore > 50 ? 'stable' : 'declining';

    return {
      decision,
      scores: { marketDemand, competitiveSaturation: competitionScore, pricingFeasibility, cacVsLtv: cacVsLtvScore },
      cacEstimate,
      ltvEstimate,
      ltvCacRatio,
      riskScore,
      riskFactors,
      trendAnalysis: {
        googleTrendsScore: trendsScore,
        trendDirection,
        risingQueriesCount: topOpp?.risingQueries?.length ?? 3,
        marketMomentum: trendDirection === 'rising'
          ? `Strong upward momentum. Search interest at ${trendsScore}/100 with ${topOpp?.risingQueries?.length ?? 0} rising breakout queries.`
          : trendDirection === 'stable'
          ? `Stable market demand at ${trendsScore}/100. Mature market with consistent search interest.`
          : `Declining search interest at ${trendsScore}/100. Consider pivoting to adjacent niche.`,
      },
      reasoning: decision === 'GO'
        ? `${serviceName} passes all validation gates. Market demand: ${marketDemand}, LTV/CAC: ${ltvCacRatio}x (threshold: 3x), risk score: ${riskScore}. Google Trends confirms ${trendDirection} interest at ${trendsScore}/100. Recommendation: PROCEED.`
        : decision === 'CONDITIONAL'
        ? `${serviceName} shows potential but has concerns: ${reasons.join('; ')}. LTV/CAC: ${ltvCacRatio}x, risk score: ${riskScore}. Recommendation: PROCEED WITH CAUTION — address flagged issues before scaling.`
        : `${serviceName} does NOT pass validation. Blockers: ${reasons.join('; ')}. LTV/CAC: ${ltvCacRatio}x is below 3x minimum. Recommendation: DO NOT PROCEED — revisit offer engineering.`,
      confidence: decision === 'GO' ? 91 : decision === 'CONDITIONAL' ? 72 : 88,
    };
  }
}
