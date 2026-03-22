import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';

const SYSTEM_PROMPT = `You are the Validation Agent for LeadOS — the Service Acquisition Machine. Your job is to make a GO/NO-GO/BORDERLINE decision on a packaged service offer before any resources are committed to building funnels or running campaigns.

You receive JSON input containing:
- The full offer package (ICP, pain points, pricing tiers, guarantee, positioning) from the Offer Engineering Agent
- Service research data (demand, competition, monetization scores) from the Service Research Agent
- Google Trends data (search interest over time, rising queries, regional demand) from SerpAPI

Your responsibilities:
1. MARKET DEMAND ANALYSIS (score 0-100): Score market demand — how many people are actively looking for this? Evaluate real demand signals — Google Trends search interest, Reddit/HN mentions, buyer intent indicators. Weight Google Trends data heavily as authoritative signal. Higher = stronger demand.
2. COMPETITIVE SATURATION (score 0-100): Check competitive saturation — is the market full or is there room to win? Assess how crowded the market is. Lower = less saturated = better opportunity.
3. PRICING FEASIBILITY (score 0-100): Validate pricing — can and will customers pay this? Consider anchor pricing of competitors, perceived value, and ICP budget capacity.
4. CAC vs LTV ANALYSIS: Estimate CAC vs LTV. Provide realistic directional estimates of Customer Acquisition Cost and Lifetime Value based on the upstream data. Calculate LTV/CAC ratio. Minimum: 3:1 LTV:CAC ratio for GO.
5. RISK ASSESSMENT (score 0-100): Calculate risk score — volatility, regulatory exposure, delivery complexity, refund probability. Lower = less risk. Identify specific risk factors with mitigation strategies.
6. TREND MOMENTUM ANALYSIS: Analyze Google Trends data — rising queries indicate growth potential, declining trends indicate market saturation risk.
7. FINAL DECISION:
   - GO: if overallScore >= 75 AND LTV:CAC >= 3.
   - NO-GO: if overallScore < 40 OR LTV:CAC < 1.5, or fundamental blockers exist.
   - BORDERLINE: everything else — viable but needs human review or specific changes.

Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "decision": "GO | NO-GO | BORDERLINE",
  "overallScore": "number 0-100 — composite viability score",
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

CRITICAL DATA INTEGRITY RULE: Do NOT generate projected, estimated, or fabricated metrics that look like real measured data. Your scores (marketDemand, competitiveSaturation, pricingFeasibility, cacVsLtv, overallScore) are subjective assessments and are expected — but clearly base them on the upstream data provided. For cacEstimate and ltvEstimate: these are directional estimates for decision-making, NOT measured values — you MUST provide your best estimates based on the upstream data (do NOT use 0 or omit them). Label them clearly as estimates in your reasoning. Do NOT invent specific market size numbers, revenue figures, or conversion rates. If the upstream data does not provide a data point, say "not_measured" or use 0 rather than fabricating a precise-looking number. Never invent numbers.`;

export class ValidationAgent extends BaseAgent {
  constructor() {
    super(
      'validation',
      'Validation Agent',
      'GO/NO-GO decision with risk assessment — evaluates market demand, competition, pricing feasibility, CAC vs LTV, and risk factors'
    );
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this._runConfig = inputs.config;
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

      // Label CAC/LTV estimates — these are LLM directional guesses, kept for threshold enforcement
      if (parsed.cacEstimate !== undefined) {
        parsed._cacEstimateLabel = 'llm_estimate';
      }
      if (parsed.ltvEstimate !== undefined) {
        parsed._ltvEstimateLabel = 'llm_estimate';
      }
      if (parsed.ltvCacRatio !== undefined) {
        parsed._ltvCacRatioLabel = 'llm_estimate';
      }
      // Zero any other fabricated measured metrics (not CAC/LTV which are needed for decisions)
      if (parsed.estimatedRevenue !== undefined) parsed.estimatedRevenue = 0;
      if (parsed.projectedConversions !== undefined) parsed.projectedConversions = 0;
      if (parsed.estimatedMarketSize !== undefined) parsed.estimatedMarketSize = 'not_measured';

      // --- Post-LLM Hard GO/NO-GO Threshold Enforcement (SOP requirement) ---

      // Rename legacy "CONDITIONAL" to "BORDERLINE" BEFORE capturing original decision
      if (parsed.decision === 'CONDITIONAL') {
        parsed.decision = 'BORDERLINE';
      }

      // Guard against non-numeric LLM estimates
      const cac = typeof parsed.cacEstimate === 'number' && isFinite(parsed.cacEstimate) ? parsed.cacEstimate : NaN;
      const ltv = typeof parsed.ltvEstimate === 'number' && isFinite(parsed.ltvEstimate) ? parsed.ltvEstimate : NaN;

      let ltvCacRatio: number | undefined = typeof parsed.ltvCacRatio === 'number' && isFinite(parsed.ltvCacRatio)
        ? parsed.ltvCacRatio
        : undefined;

      if (cac > 0 && ltv > 0 && isFinite(cac) && isFinite(ltv)) {
        ltvCacRatio = ltv / cac;
        parsed.ltvCacRatio = Math.round(ltvCacRatio * 100) / 100;
      } else if (cac === 0 && ltv >= 0) {
        ltvCacRatio = Infinity;
        parsed.ltvCacRatio = Infinity;
      }

      // overallScore is a viability score, NOT confidence — default to 0 if missing
      const overallScore = typeof parsed.overallScore === 'number' ? parsed.overallScore : 0;
      const originalDecision = parsed.decision;
      let enforcedDecision = originalDecision;
      let thresholdReason = '';

      if (ltvCacRatio !== undefined && isFinite(ltvCacRatio) && ltvCacRatio < 1.5) {
        enforcedDecision = 'NO-GO';
        thresholdReason = `LTV:CAC ratio (${parsed.ltvCacRatio}) is below minimum 1.5 threshold — forced NO-GO.`;
      } else if (ltvCacRatio !== undefined && ltvCacRatio >= 3 && overallScore >= 75) {
        enforcedDecision = 'GO';
        thresholdReason = `LTV:CAC ratio (${parsed.ltvCacRatio}) >= 3 and overallScore (${overallScore}) >= 75 — confirmed GO.`;
      } else {
        enforcedDecision = 'BORDERLINE';
        thresholdReason = `Does not meet hard GO thresholds (need LTV:CAC >= 3 AND overallScore >= 75) and not NO-GO (LTV:CAC >= 1.5) — set to BORDERLINE for human review.`;
      }

      parsed.decision = enforcedDecision;
      parsed.thresholdEnforcement = {
        originalLlmDecision: originalDecision,
        enforcedDecision,
        ltvCacRatio: ltvCacRatio ?? 'not_available',
        overallScore,
        reason: thresholdReason,
      };

      this.status = 'done';
      await this.log('run_completed', { output: parsed });
      return {
        success: true,
        data: parsed,
        reasoning: parsed.reasoning || 'Validation complete',
        confidence: parsed.confidence ?? 0,
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
