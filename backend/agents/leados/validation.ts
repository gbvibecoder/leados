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
}

CRITICAL DATA INTEGRITY RULE: Do NOT generate projected, estimated, or fabricated metrics that look like real measured data. Your scores (marketDemand, competitiveSaturation, pricingFeasibility, cacVsLtv) are subjective assessments and are expected — but clearly base them on the upstream data provided. For cacEstimate and ltvEstimate: these are directional estimates for decision-making, NOT measured values. Label them clearly as estimates in your reasoning. Do NOT invent specific market size numbers, revenue figures, or conversion rates. If the upstream data does not provide a data point, say "not_measured" or use 0 rather than fabricating a precise-looking number. Never invent numbers.`;

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
      const response = await this.callClaude(SYSTEM_PROMPT, userMessage, 1, 4000);
      let parsed: any = {};
      try {
        parsed = this.safeParseLLMJson<any>(response, ['decision', 'scores']);
      } catch (parseErr: any) {
        await this.log('llm_json_parse_error', { error: parseErr.message });
        parsed = { reasoning: `LLM JSON parse failed: ${parseErr.message}`, confidence: 0 };
      }

      // Force-label CAC/LTV estimates — these are LLM directional guesses, not measured data
      if (parsed.cacEstimate !== undefined) {
        parsed._cacEstimateLabel = 'llm_estimate';
        parsed.cacEstimate = 0;
      }
      if (parsed.ltvEstimate !== undefined) {
        parsed._ltvEstimateLabel = 'llm_estimate';
        parsed.ltvEstimate = 0;
      }
      if (parsed.ltvCacRatio !== undefined) {
        parsed._ltvCacRatioLabel = 'llm_estimate';
        parsed.ltvCacRatio = 0;
      }
      // Zero any other fabricated measured metrics
      if (parsed.estimatedRevenue !== undefined) parsed.estimatedRevenue = 0;
      if (parsed.projectedConversions !== undefined) parsed.projectedConversions = 0;
      if (parsed.estimatedMarketSize !== undefined) parsed.estimatedMarketSize = 'not_measured';

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
      await this.log('run_error', { error: error.message });
      return {
        success: false,
        data: { error: error.message, agentId: this.id },
        reasoning: `Agent failed: ${error.message}. No mock data used.`,
        confidence: 0,
      };
    }
  }
}
