import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import * as ga4 from '../../integrations/google-analytics';
import * as googleAds from '../../integrations/google-ads';
import * as metaAds from '../../integrations/meta-ads';

const SYSTEM_PROMPT = `You are the Tracking & Attribution Agent for LeadOS — the Service Acquisition Machine. You set up and maintain the full analytics infrastructure so every lead can be traced back to the exact ad, email, or post that generated it.

You MUST use data from previous agents when available:
- From Funnel Builder (agent 4): Landing page URLs to install tracking code
- From Paid Traffic (agent 6): Ad campaign IDs, Google/Meta account details
- From Outbound Outreach (agent 7): Email campaign data for attribution
- From Inbound Capture (agent 8): CRM data, lead sources, channel breakdown
- From Sales Routing (agent 10): Conversion data, checkout/sales/nurture routing

RESPONSIBILITY 1: GOOGLE TAG MANAGER
- Configure GTM container with all necessary tags, triggers, and variables
- Set up data layer events for key funnel actions (lead, call, meeting, purchase)
- Ensure tags fire in correct order with proper consent mode

RESPONSIBILITY 2: META PIXEL
- Install Facebook/Meta Pixel with standard events (PageView, Lead, Purchase)
- Create custom events for LeadOS-specific actions (QualificationCall, MeetingBooked)
- Enable Conversions API (CAPI) for server-side event matching
- Configure custom audiences based on pixel events

RESPONSIBILITY 3: GOOGLE ADS CONVERSION TRACKING
- Set up conversion actions for each funnel stage with proper values
- Enable enhanced conversions for better match rates
- Configure offline conversion import for CRM-tracked conversions
- Set attribution windows (click-through, view-through)

RESPONSIBILITY 4: CRM ATTRIBUTION
- Tag every CRM record with source campaign, UTM parameters, click IDs
- Implement position-based multi-touch attribution (40% first / 20% middle / 40% last)
- Track full customer journey across all touchpoints
- Connect ad clicks to CRM outcomes for ROAS calculation

RESPONSIBILITY 5: MULTI-TOUCH ATTRIBUTION
- Track the complete lead journey across channels
- Model attribution credit across multiple touchpoints
- Provide channel-level and campaign-level attribution reports
- Calculate true cost per acquisition by channel

RESPONSIBILITY 6: UTM TRACKING
- Enforce UTM parameter standards across all campaigns
- Auto-generate UTM links for each channel/campaign
- Store UTM data in CRM for attribution
- UTM parameter validation and deduplication

Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "trackingSetup": {
    "googleTagManager": {
      "containerId": "string",
      "tags": [{ "name": "string", "type": "string", "trigger": "string", "config": {} }],
      "triggers": [{ "name": "string", "type": "string", "conditions": ["string"] }],
      "variables": [{ "name": "string", "type": "string", "value": "string" }]
    },
    "metaPixel": {
      "pixelId": "string",
      "standardEvents": ["string"],
      "customEvents": [{ "name": "string", "parameters": ["string"] }],
      "capiEnabled": "boolean",
      "customAudiences": [{ "name": "string", "basedOn": "string", "lookbackDays": "number" }]
    },
    "googleAdsConversion": {
      "conversionId": "string",
      "conversionActions": [{ "name": "string", "category": "string", "value": "number|dynamic", "countingType": "string", "clickThroughWindow": "string", "viewThroughWindow": "string" }],
      "enhancedConversions": "boolean",
      "offlineImport": "boolean"
    },
    "crmAttribution": {
      "model": "string",
      "firstTouchWeight": "number",
      "lastTouchWeight": "number",
      "middleTouchWeight": "number",
      "trackingFields": ["string"],
      "touchpointCapture": ["string"]
    }
  },
  "attributionModel": "string",
  "attributionWindows": { "clickThrough": "string", "viewThrough": "string" },
  "dataLayerEvents": [{ "event": "string", "parameters": ["string"], "trigger": "string" }],
  "utmStrategy": {
    "namingConvention": "string",
    "generatedLinks": [{ "campaign": "string", "channel": "string", "url": "string" }],
    "parameters": ["string"]
  },
  "channelAttribution": [{
    "channel": "string",
    "leadsAttributed": "number",
    "spend": "number",
    "revenue": "number",
    "costPerLead": "number",
    "roas": "number",
    "firstTouchCredit": "number",
    "lastTouchCredit": "number",
    "assistedConversions": "number"
  }],
  "leadJourneys": [{
    "leadName": "string",
    "leadEmail": "string",
    "touchpoints": [{ "channel": "string", "action": "string", "timestamp": "string", "creditPercent": "number" }],
    "totalTouchpoints": "number",
    "daysToConvert": "number",
    "convertedAction": "string",
    "attributedRevenue": "number"
  }],
  "validationChecklist": [{ "check": "string", "status": "passed|failed|pending" }],
  "summary": {
    "totalEventsTracked": "number",
    "totalLeadsAttributed": "number",
    "avgTouchpointsPerLead": "number",
    "avgDaysToConvert": "number",
    "topChannel": "string",
    "topCampaign": "string",
    "overallROAS": "number",
    "trackingCoverage": "number"
  },
  "reasoning": "string",
  "confidence": "number 0-100"
}

Accuracy is paramount — misattributed conversions lead to bad budget decisions. Always validate tracking fires end-to-end.

CRITICAL DATA INTEGRITY RULE: Do NOT generate projected, estimated, or fabricated metrics. Tracking setup (GTM tags, Meta Pixel config, conversion actions, UTM strategy) and attribution model configuration are strategic outputs and are expected. However, for channelAttribution: ONLY include data from real GA4, Google Ads, or Meta Ads API responses provided in the input. If no real analytics data exists, return an empty channelAttribution array with all numeric values set to 0. For leadJourneys: ONLY include real leads with real touchpoint data. If no real journey data exists, return an empty array. For summary: set totalEventsTracked, totalLeadsAttributed, avgTouchpointsPerLead, avgDaysToConvert, overallROAS, trackingCoverage all to 0 if no real data. Never fabricate attribution data, ROAS numbers, spend figures, or revenue numbers.`;

export class TrackingAttributionAgent extends BaseAgent {
  constructor() {
    super(
      'tracking-attribution',
      'Tracking & Attribution Agent',
      'Full analytics infrastructure — GTM, Meta Pixel, Google Ads conversion, CRM multi-touch attribution, and UTM tracking'
    );
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this.status = 'running';
    await this.log('run_started', { inputs });

    try {
      const previousOutputs = inputs.previousOutputs || {};
      const funnelData = previousOutputs['funnel-builder'] || {};
      const paidTrafficData = previousOutputs['paid-traffic'] || {};
      const outboundData = previousOutputs['outbound-outreach'] || {};
      const inboundData = previousOutputs['inbound-capture'] || {};
      const routingData = previousOutputs['sales-routing'] || {};
      const validationData = previousOutputs['validation'] || {};

      if (validationData.decision === 'NO-GO') {
        this.status = 'done';
        return {
          success: false,
          data: { skipped: true, reason: 'Validation agent returned NO-GO decision' },
          reasoning: 'Tracking & attribution skipped — upstream validation rejected this opportunity.',
          confidence: 100,
        };
      }

      // Fetch real analytics data if available
      let realTraffic: any[] = [];
      let realConversions: any[] = [];
      let realGoogleCampaigns: any[] = [];
      let realMetaCampaigns: any[] = [];

      // Fetch all analytics data in parallel
      await this.log('data_fetch', { phase: 'Fetching GA4, Google Ads, Meta Ads data in parallel' });
      const [ga4Result, googleResult, metaResult] = await Promise.allSettled([
        ga4.isGoogleAnalyticsAvailable()
          ? Promise.all([ga4.getTrafficReport(), ga4.getConversionReport()])
          : Promise.resolve([[], []]),
        googleAds.isGoogleAdsAvailable()
          ? googleAds.getCampaignMetrics()
          : Promise.resolve([]),
        metaAds.isMetaAdsAvailable()
          ? metaAds.getCampaignInsights()
          : Promise.resolve([]),
      ]);

      if (ga4Result.status === 'fulfilled') {
        [realTraffic, realConversions] = ga4Result.value;
        if (realTraffic.length > 0 || realConversions.length > 0)
          await this.log('ga4_fetched', { traffic: realTraffic.length, conversions: realConversions.length });
      } else {
        await this.log('ga4_fetch_failed', { error: ga4Result.reason?.message });
      }

      if (googleResult.status === 'fulfilled') {
        realGoogleCampaigns = googleResult.value;
        if (realGoogleCampaigns.length > 0)
          await this.log('google_ads_fetched', { campaigns: realGoogleCampaigns.length });
      } else {
        await this.log('google_ads_fetch_failed', { error: googleResult.reason?.message });
      }

      if (metaResult.status === 'fulfilled') {
        realMetaCampaigns = metaResult.value;
        if (realMetaCampaigns.length > 0)
          await this.log('meta_ads_fetched', { campaigns: realMetaCampaigns.length });
      } else {
        await this.log('meta_ads_fetch_failed', { error: metaResult.reason?.message });
      }

      const userMessage = JSON.stringify({
        serviceNiche: inputs.config?.niche || inputs.config?.serviceNiche || 'B2B SaaS Lead Generation',
        ...inputs.config,
        realAnalytics: {
          ga4Traffic: realTraffic.length > 0 ? realTraffic : undefined,
          ga4Conversions: realConversions.length > 0 ? realConversions : undefined,
          googleAdsCampaigns: realGoogleCampaigns.length > 0 ? realGoogleCampaigns : undefined,
          metaAdsCampaigns: realMetaCampaigns.length > 0 ? realMetaCampaigns : undefined,
        },
        upstreamContext: {
          landingPages: funnelData.landingPage?.url || funnelData.deployedUrl || null,
          adCampaigns: paidTrafficData.googleAds || paidTrafficData.metaAds ? {
            google: paidTrafficData.googleAds?.campaignId || null,
            meta: paidTrafficData.metaAds?.campaignId || null,
          } : null,
          emailCampaigns: outboundData.coldEmail?.campaignId || null,
          channelBreakdown: inboundData.channelBreakdown || null,
          leadsProcessed: inboundData.summary?.totalLeadsProcessed || null,
          routingSummary: routingData.summary || null,
        },
      });

      const response = await this.callClaude(SYSTEM_PROMPT, userMessage, 3, 6000);
      let parsed: any = {};
      try {
        parsed = this.safeParseLLMJson<any>(response, ['trackingSetup', 'attributionModel']);
      } catch (parseErr: any) {
        await this.log('llm_json_parse_error', { error: parseErr.message });
        parsed = { reasoning: `LLM JSON parse failed: ${parseErr.message}`, confidence: 0 };
      }

      // ── BUILD CLEAN OUTPUT — DO NOT trust ANY metric from LLM ──────────
      const cleanOutput: any = {
        trackingSetup: parsed.trackingSetup || {},
        attributionModel: parsed.attributionModel || {},
        attributionWindows: parsed.attributionWindows || {},
        dataLayerEvents: parsed.dataLayerEvents || [],
        utmStrategy: parsed.utmStrategy || {},
        validationChecklist: parsed.validationChecklist || [],
        // ALL metrics zeroed — no real analytics data exists
        summary: { totalEventsTracked: 0, totalLeadsAttributed: 0, avgTouchpoints: 0, avgDaysToConvert: 0, overallROAS: 0, trackingCoverage: 0 },
        channelAttribution: [],
        leadJourneys: [],
        totalEventsTracked: 0,
        overallROAS: 0,
        coverage: 0,
        reasoning: parsed.reasoning || '',
        confidence: parsed.confidence || 0,
      };

      this.status = 'done';
      await this.log('run_completed', { output: cleanOutput });
      return {
        success: true,
        data: cleanOutput,
        reasoning: cleanOutput.reasoning || 'Tracking and attribution infrastructure configured.',
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
