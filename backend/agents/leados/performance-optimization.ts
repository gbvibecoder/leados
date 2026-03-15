import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import * as googleAds from '../../integrations/google-ads';
import * as metaAds from '../../integrations/meta-ads';
import * as ga4 from '../../integrations/google-analytics';

const SYSTEM_PROMPT = `You are the Performance Optimization Agent for LeadOS — the Service Acquisition Machine. You continuously monitor all campaign metrics and automatically improve performance. You never sleep — you're a 24/7 media buyer and analyst.

You MUST use data from previous agents when available:
- From Paid Traffic (agent 6): Ad spend data, campaign performance, CPC, CTR
- From AI Qualification (agent 9): Lead quality data, BANT scores, qualification rates
- From Tracking & Attribution (agent 11): Channel attribution, ROAS, cost per channel, lead journeys

RESPONSIBILITY 1: METRIC MONITORING
Track these key metrics in real-time:
- CPL (Cost Per Lead) — how much each lead costs
- CAC (Customer Acquisition Cost) — total cost to acquire a paying customer
- ROAS (Return on Ad Spend) — revenue generated per dollar spent
- LTV (Lifetime Value) — total expected revenue from one customer
- LTV/CAC Ratio — must be > 3x for healthy unit economics
- Conversion Rate — visitor to lead
- Qualification Rate — lead to qualified lead

RESPONSIBILITY 2: CAMPAIGN ANALYSIS
Evaluate each campaign and assign a status:
- SCALE (ROAS > 3x, CPL below target): Increase budget 20-50%
- OPTIMIZE (ROAS 1.5-3x): Adjust targeting, refresh creatives, test new hooks
- KILL (ROAS < 1x after $200+ spend): Pause immediately, reallocate budget

RESPONSIBILITY 3: BUDGET REALLOCATION
- Move budget from killed/underperforming campaigns to top performers
- Never exceed total budget — reallocate, don't inflate
- Show before/after budget allocation with rationale

RESPONSIBILITY 4: CREATIVE FATIGUE DETECTION
- Monitor CTR trends over 7-day rolling windows
- If CTR drops > 15% in 7 days → flag for creative refresh
- Track ad frequency — if > 3x in 7 days, refresh needed
- Suggest new creative angles based on winning patterns

RESPONSIBILITY 5: OFFER REFINEMENT
- If overall conversion < 2%, suggest offer changes
- If CPL rising across all channels, suggest pricing adjustment
- If qualification rate < 15%, suggest ICP refinement
- Provide specific, actionable recommendations

RESPONSIBILITY 6: WEEKLY PERFORMANCE REPORT
- Week-over-week trends for all key metrics
- Top and bottom performing campaigns
- Budget efficiency analysis
- Actionable next steps

Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "currentMetrics": {
    "cpl": "number",
    "cac": "number",
    "roas": "number",
    "ltv": "number",
    "ltvCacRatio": "number",
    "conversionRate": "number",
    "qualificationRate": "number",
    "totalSpend": "number",
    "totalRevenue": "number",
    "totalLeads": "number"
  },
  "campaignAnalysis": [{
    "campaign": "string",
    "channel": "string",
    "status": "scale|optimize|kill",
    "metrics": {
      "spend": "number",
      "leads": "number",
      "cpl": "number",
      "roas": "number",
      "ctr": "number",
      "conversionRate": "number",
      "qualifiedLeads": "number",
      "meetings": "number"
    },
    "action": "string",
    "reason": "string",
    "budgetChange": "string"
  }],
  "budgetReallocation": {
    "totalBudget": "number",
    "before": { "campaignName": "number" },
    "after": { "campaignName": "number" },
    "savings": "number",
    "rationale": "string"
  },
  "creativeFatigue": [{
    "campaign": "string",
    "ctrTrend": "string",
    "frequency": "number",
    "fatigueLevel": "low|medium|high",
    "recommendation": "string"
  }],
  "offerRefinements": [{
    "priority": "high|medium|low",
    "area": "string",
    "currentState": "string",
    "recommendation": "string",
    "expectedImpact": "string"
  }],
  "weeklyReport": {
    "period": "string",
    "leadsGenerated": "number",
    "qualifiedLeads": "number",
    "meetingsBooked": "number",
    "revenue": "number",
    "roasOverall": "number",
    "weekOverWeek": { "leads": "string", "qualified": "string", "revenue": "string", "cpl": "string" },
    "topPerformer": "string",
    "bottomPerformer": "string"
  },
  "alerts": [{
    "severity": "critical|warning|info",
    "metric": "string",
    "message": "string",
    "action": "string"
  }],
  "summary": {
    "campaignsScaled": "number",
    "campaignsOptimized": "number",
    "campaignsKilled": "number",
    "budgetReallocated": "number",
    "projectedRoasImprovement": "string"
  },
  "reasoning": "string",
  "confidence": "number 0-100"
}

Be ruthless with underperformers — every dollar wasted on a bad campaign is a dollar not spent on a winning one. But give new campaigns at least $200 in spend before kill decisions.

CRITICAL DATA INTEGRITY RULE: Do NOT generate projected, estimated, or fabricated metrics. Optimization recommendations, creative fatigue detection logic, and offer refinement suggestions are strategic outputs and are expected. However, for currentMetrics: ONLY use data from real Google Ads, Meta Ads, or GA4 API responses provided in the input. If no real platform data exists, set cpl, cac, roas, ltv, ltvCacRatio, conversionRate, qualificationRate, totalSpend, totalRevenue, totalLeads ALL to 0. For campaignAnalysis: ONLY analyze real campaigns with real metrics. If no real campaign data exists, return an empty array. For weeklyReport: set all numeric values to 0 if no real data. For budgetReallocation: only propose changes for real campaigns. Never fabricate CPL, ROAS, spend, revenue, lead counts, or any performance metric. Never invent numbers that look like measured data.`;

export class PerformanceOptimizationAgent extends BaseAgent {
  constructor() {
    super(
      'performance-optimization',
      'Performance Optimization Agent',
      'Monitors CPL/CAC/ROAS/LTV continuously, kills underperformers, scales winners, adjusts budgets, and suggests offer refinements'
    );
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this.status = 'running';
    await this.log('run_started', { inputs });

    try {
      const previousOutputs = inputs.previousOutputs || {};
      const paidTrafficData = previousOutputs['paid-traffic'] || {};
      const qualificationData = previousOutputs['ai-qualification'] || {};
      const trackingData = previousOutputs['tracking-attribution'] || {};
      const validationData = previousOutputs['validation'] || {};

      if (validationData.decision === 'NO-GO') {
        this.status = 'done';
        return {
          success: false,
          data: { skipped: true, reason: 'Validation agent returned NO-GO decision' },
          reasoning: 'Performance optimization skipped — upstream validation rejected this opportunity.',
          confidence: 100,
        };
      }

      // Fetch real performance data from ad platforms
      let realGoogleMetrics: any[] = [];
      let realMetaInsights: any[] = [];
      let realConversions: any[] = [];

      if (googleAds.isGoogleAdsAvailable()) {
        try {
          await this.log('google_ads_fetch', { phase: 'Fetching live Google Ads metrics' });
          realGoogleMetrics = await googleAds.getCampaignMetrics();
          await this.log('google_ads_fetched', { campaigns: realGoogleMetrics.length });
        } catch (err: any) {
          await this.log('google_ads_fetch_failed', { error: err.message });
        }
      }

      if (metaAds.isMetaAdsAvailable()) {
        try {
          await this.log('meta_ads_fetch', { phase: 'Fetching live Meta Ads insights' });
          realMetaInsights = await metaAds.getCampaignInsights();
          await this.log('meta_ads_fetched', { campaigns: realMetaInsights.length });
        } catch (err: any) {
          await this.log('meta_ads_fetch_failed', { error: err.message });
        }
      }

      if (ga4.isGoogleAnalyticsAvailable()) {
        try {
          realConversions = await ga4.getConversionReport();
          await this.log('ga4_conversions_fetched', { events: realConversions.length });
        } catch (err: any) {
          await this.log('ga4_fetch_failed', { error: err.message });
        }
      }

      const userMessage = JSON.stringify({
        serviceNiche: inputs.config?.niche || inputs.config?.serviceNiche || 'B2B SaaS Lead Generation',
        ...inputs.config,
        realPerformanceData: {
          googleAds: realGoogleMetrics.length > 0 ? realGoogleMetrics : undefined,
          metaAds: realMetaInsights.length > 0 ? realMetaInsights : undefined,
          ga4Conversions: realConversions.length > 0 ? realConversions : undefined,
        },
        upstreamContext: {
          adCampaigns: paidTrafficData.googleAds || paidTrafficData.metaAds ? {
            google: paidTrafficData.googleAds || null,
            meta: paidTrafficData.metaAds || null,
          } : null,
          qualificationSummary: qualificationData.summary || null,
          qualificationRate: qualificationData.summary?.qualificationRate || null,
          channelAttribution: trackingData.channelAttribution || null,
          overallROAS: trackingData.summary?.overallROAS || null,
        },
      });

      const response = await this.callClaude(SYSTEM_PROMPT, userMessage);
      let parsed: any = {};
      try {
        parsed = this.safeParseLLMJson<any>(response, ['currentMetrics', 'campaignAnalysis']);
      } catch (parseErr: any) {
        await this.log('llm_json_parse_error', { error: parseErr.message });
        parsed = { reasoning: `LLM JSON parse failed: ${parseErr.message}`, confidence: 0 };
      }

      // ── BUILD CLEAN OUTPUT — DO NOT trust ANY metric from LLM ──────────
      const cleanOutput: any = {
        optimizationStrategy: parsed.optimizationStrategy || {},
        recommendations: parsed.recommendations || [],
        offerRefinements: parsed.offerRefinements || [],
        currentMetrics: { cpl: 0, cac: 0, roas: 0, ltv: 0, ltvCacRatio: 0, totalSpend: 0, totalRevenue: 0, totalLeads: 0, qualificationRate: 0 },
        campaignAnalysis: [],
        weeklyReport: { leadsGenerated: 0, qualifiedLeads: 0, meetingsBooked: 0, revenue: 0, spend: 0, roas: 0, cpl: 0 },
        budgetReallocation: { totalBudget: 0, savings: 0, recommendations: parsed.budgetReallocation?.recommendations || [] },
        summary: { campaignsScaled: 0, campaignsOptimized: 0, campaignsKilled: 0, budgetReallocated: 0, projectedRoasImprovement: '0%' },
        creativeFatigue: [],
        alerts: (parsed.alerts || []).map((a: any) => ({
          severity: a.severity || 'info',
          metric: a.metric || '',
          message: a.message || '',
          action: a.action || '',
          note: 'No real campaign data — this is a pre-launch recommendation based on strategy, not measured data.',
        })),
        reasoning: parsed.reasoning || '',
        confidence: parsed.confidence || 0,
      };

      // No campaigns to mutate since campaignAnalysis is empty (no real data)
      // But keep real platform data references if they exist
      if (realGoogleMetrics.length > 0) cleanOutput._realGoogleMetrics = realGoogleMetrics;
      if (realMetaInsights.length > 0) cleanOutput._realMetaInsights = realMetaInsights;

      this.status = 'done';
      await this.log('run_completed', { output: cleanOutput });
      return {
        success: true,
        data: cleanOutput,
        reasoning: cleanOutput.reasoning || 'Performance optimization analysis complete.',
        confidence: cleanOutput.confidence || 85,
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
