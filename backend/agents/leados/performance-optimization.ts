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

RESPONSIBILITY 2: CAMPAIGN ANALYSIS — KILL RULES (SOP-mandated)
Evaluate each campaign and assign a status. Apply these STRICT kill rules:
- KILL if campaign has been running 72+ hours with 0 conversions
- KILL if campaign has spent 2x the target CPL with no results
- KILL creative if CTR drops >15% in a 7-day window OR frequency exceeds 3x
- KILL (ROAS < 1x after $200+ spend): Pause immediately, reallocate budget

SCALE RULES (SOP-mandated):
- SCALE if ROAS >3x target
- SCALE if CPL <50% of target for 48+ consecutive hours
- Budget increases MUST be max 20% per day — no sudden 5x jumps
- OPTIMIZE (ROAS 1.5-3x): Adjust targeting, refresh creatives, test new hooks

For each campaign, include "hoursRunning", "totalConversions", "targetCPL", and "consecutiveHoursBelowHalfCPL" in metrics when available.

RESPONSIBILITY 3: BUDGET REALLOCATION
- Move budget from killed/underperforming campaigns to top performers
- Budget freed from killed campaigns MUST be redistributed proportionally to campaigns marked as "scale"
- Never exceed total budget — reallocate, don't inflate
- Show before/after budget allocation with rationale

RESPONSIBILITY 4: CREATIVE FATIGUE DETECTION
- Monitor CTR trends over 7-day rolling windows
- If CTR drops > 15% in 7 days → flag for creative refresh AND trigger kill
- Track ad frequency — if > 3x in 7 days, refresh needed AND trigger kill
- Suggest new creative angles based on winning patterns

RESPONSIBILITY 5: OFFER REFINEMENT
- If overall conversion < 2%, suggest offer changes
- If CPL rising across all channels, suggest pricing adjustment
- If qualification rate < 15%, suggest ICP refinement
- CRITICAL: If CPL is consistently >2x target across ALL channels, recommend offer/pricing/messaging changes (not just campaign tweaks) — this indicates a fundamental offer problem, not a media buying problem
- Provide specific, actionable recommendations

RESPONSIBILITY 6: WEEKLY PERFORMANCE REPORT (Deliver every Monday per SOP)
- Total spend vs budget
- CPL by channel
- ROAS by channel
- Top 3 winners and why they won
- Top 3 losers and why they were killed
- Recommended actions for next week
- Week-over-week trends for all key metrics

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
    "totalSpendVsBudget": { "spent": "number", "budget": "number", "percentUsed": "number" },
    "cplByChannel": { "channelName": "number" },
    "roasByChannel": { "channelName": "number" },
    "topWinners": [{ "campaign": "string", "reason": "string" }],
    "topLosers": [{ "campaign": "string", "reason": "string" }],
    "recommendedActions": ["string"],
    "leadsGenerated": "number",
    "qualifiedLeads": "number",
    "meetingsBooked": "number",
    "revenue": "number",
    "roasOverall": "number",
    "weekOverWeek": { "leads": "string", "qualified": "string", "revenue": "string", "cpl": "string" }
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
    this._runConfig = inputs.config;
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

      // Fetch all platform data in parallel
      await this.log('data_fetch', { phase: 'Fetching Google Ads, Meta Ads, GA4 data in parallel' });
      const [googleResult, metaResult, ga4Result] = await Promise.allSettled([
        googleAds.isGoogleAdsAvailable()
          ? googleAds.getCampaignMetrics()
          : Promise.resolve([]),
        metaAds.isMetaAdsAvailable()
          ? metaAds.getCampaignInsights()
          : Promise.resolve([]),
        ga4.isGoogleAnalyticsAvailable()
          ? ga4.getConversionReport()
          : Promise.resolve([]),
      ]);

      if (googleResult.status === 'fulfilled') {
        realGoogleMetrics = googleResult.value;
        if (realGoogleMetrics.length > 0)
          await this.log('google_ads_fetched', { campaigns: realGoogleMetrics.length });
      } else {
        await this.log('google_ads_fetch_failed', { error: googleResult.reason?.message });
      }

      if (metaResult.status === 'fulfilled') {
        realMetaInsights = metaResult.value;
        if (realMetaInsights.length > 0)
          await this.log('meta_ads_fetched', { campaigns: realMetaInsights.length });
      } else {
        await this.log('meta_ads_fetch_failed', { error: metaResult.reason?.message });
      }

      if (ga4Result.status === 'fulfilled') {
        realConversions = ga4Result.value;
        if (realConversions.length > 0)
          await this.log('ga4_conversions_fetched', { events: realConversions.length });
      } else {
        await this.log('ga4_fetch_failed', { error: ga4Result.reason?.message });
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

      const response = await this.callClaude(SYSTEM_PROMPT, userMessage, 1, 8192);
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
        weeklyReport: {
          period: '',
          totalSpendVsBudget: { spent: 0, budget: 0, percentUsed: 0 },
          cplByChannel: {},
          roasByChannel: {},
          topWinners: [],
          topLosers: [],
          recommendedActions: [],
          leadsGenerated: 0,
          qualifiedLeads: 0,
          meetingsBooked: 0,
          revenue: 0,
          roasOverall: 0,
          weekOverWeek: { leads: '0%', qualified: '0%', revenue: '0%', cpl: '0%' },
        },
        budgetReallocation: { totalBudget: 0, savings: 0, before: {}, after: {}, rationale: '', recommendations: parsed.budgetReallocation?.recommendations || [] },
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

      // ── POST-LLM ENFORCEMENT: SOP Kill/Scale Rules ──────────
      // Apply deterministic kill/scale rules on real campaign data
      const targetCPL = inputs.config?.targetCPL || 0;
      const targetROAS = inputs.config?.targetROAS || 0;
      const allRealCampaigns = [
        ...realGoogleMetrics.map((c: any) => ({ ...c, _source: 'google' })),
        ...realMetaInsights.map((c: any) => ({ ...c, _source: 'meta' })),
      ];

      if (allRealCampaigns.length > 0) {
        for (const campaign of allRealCampaigns) {
          const hoursRunning = campaign.hoursRunning || 0;
          const conversions = campaign.conversions || 0;
          const spend = campaign.spend || campaign.cost || 0;
          const cpl = conversions > 0 ? spend / conversions : Infinity;
          const roas = campaign.roas || 0;
          const ctr = campaign.ctr || 0;
          const ctrChange7d = campaign.ctrChange7d || 0; // negative = drop
          const frequency = campaign.frequency || 0;
          const consecutiveHoursBelowHalfCPL = campaign.consecutiveHoursBelowHalfCPL || 0;

          let status = 'optimize';
          let reason = '';
          let budgetChangePercent = 0;

          // ── KILL RULES (SOP-mandated, checked first) ──
          if (hoursRunning >= 72 && conversions === 0) {
            status = 'kill';
            reason = `SOP Kill: ${hoursRunning}h running with 0 conversions (threshold: 72h)`;
          } else if (targetCPL > 0 && spend >= targetCPL * 2 && conversions === 0) {
            status = 'kill';
            reason = `SOP Kill: Spent $${spend.toFixed(2)} (2x target CPL $${targetCPL}) with no results`;
          } else if (ctrChange7d < -15) {
            status = 'kill';
            reason = `SOP Kill: CTR dropped ${Math.abs(ctrChange7d).toFixed(1)}% in 7 days (threshold: 15%)`;
          } else if (frequency > 3) {
            status = 'kill';
            reason = `SOP Kill: Frequency ${frequency.toFixed(1)}x exceeds 3x threshold`;
          } else if (roas < 1 && spend >= 200) {
            status = 'kill';
            reason = `SOP Kill: ROAS ${roas.toFixed(2)}x < 1x after $${spend.toFixed(2)} spend (threshold: $200)`;
          }
          // ── SCALE RULES (SOP-mandated) ──
          else if (targetROAS > 0 && roas > targetROAS * 3) {
            status = 'scale';
            reason = `SOP Scale: ROAS ${roas.toFixed(2)}x exceeds 3x target (${targetROAS})`;
            budgetChangePercent = 20; // Max 20% per day per SOP
          } else if (targetCPL > 0 && cpl < targetCPL * 0.5 && consecutiveHoursBelowHalfCPL >= 48) {
            status = 'scale';
            reason = `SOP Scale: CPL $${cpl.toFixed(2)} < 50% of target ($${targetCPL}) for ${consecutiveHoursBelowHalfCPL}h`;
            budgetChangePercent = 20; // Max 20% per day per SOP
          }

          const entry = {
            campaign: campaign.name || campaign.campaignName || campaign.id || 'unknown',
            channel: campaign._source === 'google' ? 'Google Ads' : 'Meta Ads',
            status,
            metrics: {
              spend,
              leads: conversions,
              cpl: cpl === Infinity ? 0 : cpl,
              roas,
              ctr,
              conversionRate: campaign.conversionRate || 0,
              qualifiedLeads: campaign.qualifiedLeads || 0,
              meetings: campaign.meetings || 0,
              hoursRunning,
              totalConversions: conversions,
              targetCPL,
              consecutiveHoursBelowHalfCPL,
            },
            action: status === 'kill' ? 'Pause immediately and reallocate budget'
              : status === 'scale' ? `Increase budget by ${budgetChangePercent}% (max 20%/day per SOP)`
              : 'Adjust targeting, refresh creatives, test new hooks',
            reason,
            budgetChange: status === 'kill' ? '-100%'
              : status === 'scale' ? `+${budgetChangePercent}%`
              : '0%',
          };
          cleanOutput.campaignAnalysis.push(entry);
        }

        // ── BUDGET REALLOCATION: Redistribute killed budget to scaled campaigns ──
        const killedCampaigns = cleanOutput.campaignAnalysis.filter((c: any) => c.status === 'kill');
        const scaledCampaigns = cleanOutput.campaignAnalysis.filter((c: any) => c.status === 'scale');
        const totalKilledBudget = killedCampaigns.reduce((sum: number, c: any) => sum + (c.metrics.spend || 0), 0);

        const totalBudget = allRealCampaigns.reduce((sum: number, c: any) => sum + (c.spend || c.cost || 0), 0);
        const before: Record<string, number> = {};
        const after: Record<string, number> = {};

        for (const c of cleanOutput.campaignAnalysis) {
          before[c.campaign] = c.metrics.spend;
          if (c.status === 'kill') {
            after[c.campaign] = 0;
          } else {
            after[c.campaign] = c.metrics.spend;
          }
        }

        // Redistribute killed budget to scaled campaigns, respecting 20% cap per SOP
        if (scaledCampaigns.length > 0 && totalKilledBudget > 0) {
          let remainingToRedistribute = totalKilledBudget;
          // Multiple passes to redistribute excess from capped campaigns
          let eligibleCampaigns = scaledCampaigns.map((c: any) => c.campaign);
          while (remainingToRedistribute > 0.01 && eligibleCampaigns.length > 0) {
            const sharePerCampaign = remainingToRedistribute / eligibleCampaigns.length;
            const nextEligible: string[] = [];
            let distributed = 0;
            for (const name of eligibleCampaigns) {
              const currentBudget = before[name] || 0;
              const maxIncrease = currentBudget * 0.2;
              const alreadyAdded = (after[name] || 0) - currentBudget;
              const roomLeft = maxIncrease - alreadyAdded;
              if (roomLeft <= 0) continue;
              const actualAdd = Math.min(sharePerCampaign, roomLeft);
              after[name] = (after[name] || 0) + actualAdd;
              distributed += actualAdd;
              if (actualAdd < sharePerCampaign) {
                // This campaign is now capped, don't include in next pass
              } else {
                nextEligible.push(name);
              }
            }
            remainingToRedistribute -= distributed;
            eligibleCampaigns = nextEligible;
            if (distributed < 0.01) break; // No progress, avoid infinite loop
          }
        }

        cleanOutput.budgetReallocation = {
          totalBudget,
          before,
          after,
          savings: totalKilledBudget,
          rationale: killedCampaigns.length > 0
            ? `Killed ${killedCampaigns.length} underperforming campaign(s), freeing $${totalKilledBudget.toFixed(2)} for redistribution to ${scaledCampaigns.length} scaling campaign(s).`
            : 'No campaigns killed — no budget to redistribute.',
          recommendations: parsed.budgetReallocation?.recommendations || [],
        };

        // ── SUMMARY COUNTS ──
        cleanOutput.summary.campaignsKilled = killedCampaigns.length;
        cleanOutput.summary.campaignsScaled = scaledCampaigns.length;
        cleanOutput.summary.campaignsOptimized = cleanOutput.campaignAnalysis.filter((c: any) => c.status === 'optimize').length;
        cleanOutput.summary.budgetReallocated = totalKilledBudget;

        // ── WEEKLY REPORT (SOP: Deliver every Monday) ──
        const channelSpend: Record<string, number> = {};
        const channelLeads: Record<string, number> = {};
        const channelRevenue: Record<string, number> = {};
        for (const c of cleanOutput.campaignAnalysis) {
          const ch = c.channel;
          channelSpend[ch] = (channelSpend[ch] || 0) + c.metrics.spend;
          channelLeads[ch] = (channelLeads[ch] || 0) + c.metrics.leads;
          channelRevenue[ch] = (channelRevenue[ch] || 0) + (c.metrics.roas * c.metrics.spend);
        }
        const cplByChannel: Record<string, number> = {};
        const roasByChannel: Record<string, number> = {};
        for (const ch of Object.keys(channelSpend)) {
          cplByChannel[ch] = channelLeads[ch] > 0 ? channelSpend[ch] / channelLeads[ch] : (channelSpend[ch] > 0 ? Infinity : 0);
          roasByChannel[ch] = channelSpend[ch] > 0 ? channelRevenue[ch] / channelSpend[ch] : 0;
        }

        // JSON-safe version of cplByChannel for serialization (Infinity → -1 sentinel)
        const cplByChannelSafe: Record<string, number> = {};
        for (const ch of Object.keys(cplByChannel)) {
          cplByChannelSafe[ch] = isFinite(cplByChannel[ch]) ? cplByChannel[ch] : -1;
        }

        // Top 3 winners (scaled campaigns sorted by ROAS descending)
        const winners = [...cleanOutput.campaignAnalysis]
          .filter((c: any) => c.status === 'scale')
          .sort((a: any, b: any) => (b.metrics.roas || 0) - (a.metrics.roas || 0))
          .slice(0, 3)
          .map((c: any) => ({ campaign: c.campaign, reason: c.reason }));

        // Top 3 losers (killed campaigns)
        const losers = [...cleanOutput.campaignAnalysis]
          .filter((c: any) => c.status === 'kill')
          .slice(0, 3)
          .map((c: any) => ({ campaign: c.campaign, reason: c.reason }));

        const configBudget = inputs.config?.totalBudget || inputs.config?.budget || totalBudget;
        cleanOutput.weeklyReport = {
          period: parsed.weeklyReport?.period || new Date().toISOString().slice(0, 10),
          totalSpendVsBudget: { spent: totalBudget, budget: configBudget, percentUsed: configBudget > 0 ? (totalBudget / configBudget) * 100 : 0 },
          cplByChannel: cplByChannelSafe,
          roasByChannel,
          topWinners: winners,
          topLosers: losers,
          recommendedActions: parsed.weeklyReport?.recommendedActions || [],
          leadsGenerated: cleanOutput.campaignAnalysis.reduce((s: number, c: any) => s + c.metrics.leads, 0),
          qualifiedLeads: cleanOutput.campaignAnalysis.reduce((s: number, c: any) => s + c.metrics.qualifiedLeads, 0),
          meetingsBooked: cleanOutput.campaignAnalysis.reduce((s: number, c: any) => s + c.metrics.meetings, 0),
          revenue: Object.values(channelRevenue).reduce((s: number, v: any) => s + v, 0),
          roasOverall: totalBudget > 0 ? Object.values(channelRevenue).reduce((s: number, v: any) => s + v, 0) / totalBudget : 0,
          weekOverWeek: parsed.weeklyReport?.weekOverWeek || { leads: '0%', qualified: '0%', revenue: '0%', cpl: '0%' },
        };

        // ── OFFER REFINEMENT TRIGGER: CPL >2x target across ALL channels ──
        if (targetCPL > 0 && Object.keys(cplByChannel).length > 0) {
          const allChannelsAbove2x = Object.values(cplByChannel).every((cpl: number) => cpl > targetCPL * 2);
          if (allChannelsAbove2x) {
            cleanOutput.offerRefinements = cleanOutput.offerRefinements || [];
            cleanOutput.offerRefinements.unshift({
              priority: 'high',
              area: 'Offer / Pricing / Messaging',
              currentState: `CPL exceeds 2x target ($${targetCPL}) across ALL channels: ${JSON.stringify(cplByChannelSafe)}`,
              recommendation: 'CPL is consistently >2x target across every channel. This is NOT a media buying problem — it indicates a fundamental issue with the offer, pricing, or messaging. Recommend: (1) revisit core offer and value proposition, (2) test different pricing tiers or guarantees, (3) rewrite messaging angles, (4) consider ICP re-evaluation.',
              expectedImpact: 'Reducing CPL to target range by addressing root cause rather than campaign-level optimizations.',
            });

            cleanOutput.alerts.unshift({
              severity: 'critical',
              metric: 'CPL',
              message: `CPL exceeds 2x target across ALL channels — fundamental offer/pricing/messaging change required`,
              action: 'Trigger Offer Engineering Agent re-evaluation. Campaign tweaks alone will not fix this.',
            });
          }
        }
      }

      // Keep real platform data references if they exist
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
