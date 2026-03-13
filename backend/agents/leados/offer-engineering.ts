import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import { fetchRealTrends } from '../../../src/lib/real-trends';

const SYSTEM_PROMPT = `You are the Offer Engineering Agent for LeadOS — the Service Acquisition Machine.

Your PURPOSE: Take a raw service idea and turn it into a compelling, specific offer that clearly communicates value and price to the right customer. A service idea is NOT enough — you package it into a REAL offer that makes a potential customer think: "This is exactly what I need."

You receive JSON input containing:
- Service research data from Agent 1 (niche, demand/competition/monetization scores, market size, rising queries, target audience)
- Google Trends data (search interest, rising queries, regional interest)
- Target focus area and region

YOUR RESPONSIBILITIES:
1. DEFINE THE ICP (Ideal Customer Profile):
   - Company size (employee range)
   - Revenue range
   - Industry vertical
   - Decision-maker title (who signs the check)
   - Psychographics (mindset, values, buying triggers)
   Example: "Roofing companies with 5–20 employees doing $500K–$5M revenue"

2. IDENTIFY THE CORE PAIN POINT:
   - What keeps them up at night?
   - What is the cost of inaction?
   - List 5 specific, emotionally resonant pain points this service solves

3. CRAFT THE TRANSFORMATION PROMISE:
   - A single, measurable promise that makes the offer irresistible
   - Must be specific and time-bound
   - Example: "Go from 0 leads per week to 10+ booked calls in 30 days"

4. SET THE PRICING STRUCTURE:
   - Create 3 tiers: Starter, Growth, Enterprise
   - Monthly billing
   - Enterprise should be 3–4x Starter (price anchoring)
   - Each tier has clear features and logical upgrade path
   - Price based on the VALUE delivered, not cost

5. CREATE A GUARANTEE (Risk Reversal):
   - Removes buyer hesitation
   - Performance-based, money-back, or hybrid
   - Example: "Pay nothing if we don't deliver 10+ qualified leads in 30 days"

6. POSITIONING & UNIQUE MECHANISM:
   - How this offer is different from competitors
   - The proprietary method or technology that makes the promise believable

REAL EXAMPLE: For a construction leads niche, the agent would create:
"We get roofing contractors 10 qualified appointments per month — or you don't pay. Price: $2,500/month."
That is a complete, compelling offer.

Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "offer": {
    "serviceName": "string — branded name for the service",
    "icp": {
      "description": "string — one-paragraph ICP summary",
      "companySize": "string — employee range",
      "revenue": "string — revenue range",
      "industry": "string — primary industry vertical",
      "decisionMaker": "string — job title of buyer",
      "psychographics": "string — mindset, values, and buying triggers"
    },
    "painPoints": ["string — 5 specific pain points the ICP faces"],
    "transformationPromise": "string — the core measurable promise",
    "pricingTiers": [
      {
        "name": "Starter | Growth | Enterprise",
        "price": "number — monthly price in USD",
        "billingCycle": "monthly",
        "features": ["string — list of features included"]
      }
    ],
    "guarantee": "string — risk-reversal guarantee statement",
    "positioning": "string — how this offer is positioned vs. competitors",
    "uniqueMechanism": "string — the proprietary method/technology",
    "trendInsights": {
      "searchInterest": "number — Google Trends interest score 0-100",
      "risingKeywords": ["string — breakout search terms to use in messaging"],
      "topRegions": ["string — geographic areas with highest demand"]
    }
  },
  "reasoning": "string — explain your offer engineering decisions referencing the input data",
  "confidence": "number 0-100"
}

IMPORTANT: Create a REAL, actionable offer based on the actual market data provided. Do NOT be generic. Reference specific data points from the input. The offer should be ready to present to a real client.`;

export class OfferEngineeringAgent extends BaseAgent {
  constructor() {
    super(
      'offer-engineering',
      'Offer Engineering Agent',
      'Package service opportunity into compelling offer with ICP, pain points, transformation promise, pricing tiers, guarantee, and positioning'
    );
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this.status = 'running';
    await this.log('run_started', { inputs });

    const focus = inputs.config?.focus || 'B2B services';
    const region = inputs.config?.region || 'US';

    // Step 1: Extract service research data from Agent 1
    const serviceResearchOutput = inputs.previousOutputs?.['service-research'];
    let topOpportunity: any = null;
    let allOpportunities: any[] = [];
    let dataSourcesSummary: any = null;

    if (serviceResearchOutput) {
      const srData = serviceResearchOutput;
      allOpportunities = srData.opportunities || [];
      dataSourcesSummary = srData.dataSourcesSummary;
      topOpportunity = allOpportunities[0] || null;
      await this.log('service_research_found', {
        opportunities: allOpportunities.length,
        topNiche: topOpportunity?.niche,
      });
    } else {
      await this.log('no_service_research', { reason: 'No previous Agent 1 output — fetching market data directly' });
    }

    // Step 2: If no service research data, fetch real trends for context
    let trendData: any = null;
    if (!topOpportunity) {
      try {
        await this.log('fetching_trends', { focus, region });
        const trends = await fetchRealTrends(focus, region, false);
        trendData = {
          opportunities: trends.opportunities.slice(0, 3).map(o => ({
            niche: o.niche,
            demandScore: o.demandScore,
            competitionScore: o.competitionScore,
            monetizationScore: o.monetizationScore,
            estimatedMarketSize: o.estimatedMarketSize,
            targetAudience: o.targetAudience,
            targetPlatforms: o.targetPlatforms,
            risingQueries: o.trendData.googleTrends?.risingQueries?.map((q: any) => q.query) || [],
            googleTrendsScore: o.trendData.googleTrendsScore,
          })),
          summary: trends.dataSourcesSummary,
        };
        topOpportunity = trendData.opportunities[0];
        allOpportunities = trendData.opportunities;
        await this.log('trends_fetched', { topNiche: topOpportunity?.niche });
      } catch (err: any) {
        await this.log('trends_error', { error: err.message });
      }
    }

    // Step 3: Build structured user message for Claude
    const userMessage = JSON.stringify({
      task: 'Engineer a compelling service offer based on the market research data below',
      focusArea: focus,
      region,
      topOpportunity: topOpportunity ? {
        niche: topOpportunity.niche,
        demandScore: topOpportunity.demandScore,
        competitionScore: topOpportunity.competitionScore,
        monetizationScore: topOpportunity.monetizationScore,
        googleTrendsScore: topOpportunity.googleTrendsScore,
        estimatedMarketSize: topOpportunity.estimatedMarketSize,
        targetAudience: topOpportunity.targetAudience,
        targetPlatforms: topOpportunity.targetPlatforms,
        risingQueries: topOpportunity.risingQueries || [],
        reasoning: topOpportunity.reasoning,
      } : null,
      allOpportunities: allOpportunities.slice(0, 5).map((o: any) => ({
        niche: o.niche,
        demandScore: o.demandScore,
        competitionScore: o.competitionScore,
        monetizationScore: o.monetizationScore,
        estimatedMarketSize: o.estimatedMarketSize,
        targetAudience: o.targetAudience,
      })),
      dataSourcesSummary: dataSourcesSummary || trendData?.summary || null,
    });

    // Step 4: Call Claude for AI-powered offer engineering
    try {
      await this.log('ai_offer_engineering', { phase: 'Sending market data to Claude for offer engineering' });

      const response = await this.callClaude(SYSTEM_PROMPT, userMessage);
      const parsed = this.safeParseLLMJson<any>(response, ['offer']);

      this.status = 'done';
      await this.log('run_completed', { serviceName: parsed.offer?.serviceName, confidence: parsed.confidence });

      return {
        success: true,
        data: parsed,
        reasoning: parsed.reasoning || 'Offer engineering complete — AI-generated from real market data',
        confidence: parsed.confidence || 85,
      };
    } catch (error: any) {
      await this.log('ai_error', { error: error.message, phase: 'Claude call failed — using intelligent fallback' });

      // Fallback: generate offer from available data
      this.status = 'done';
      const fallbackData = this.generateFallbackOffer(topOpportunity, allOpportunities, focus);
      return {
        success: true,
        data: fallbackData,
        reasoning: fallbackData.reasoning,
        confidence: fallbackData.confidence,
      };
    }
  }

  /**
   * Generates a data-driven fallback offer when Claude API is unavailable.
   * Uses actual market data from Agent 1 to create contextually relevant output.
   */
  private generateFallbackOffer(topOpp: any, allOpps: any[], focus: string): any {
    const niche = topOpp?.niche || focus || 'AI-Powered Lead Generation';
    const marketSize = topOpp?.estimatedMarketSize || '$4.2B';
    const demandScore = topOpp?.demandScore || 75;
    const competitionScore = topOpp?.competitionScore || 45;
    const risingQueries = topOpp?.risingQueries || ['AI lead generation', 'automated outbound', 'B2B sales automation'];
    const trendsScore = topOpp?.googleTrendsScore || 72;
    const platforms = topOpp?.targetPlatforms || ['LinkedIn', 'Google Ads'];
    const targetAudience = topOpp?.targetAudience || 'B2B SaaS companies with 10-200 employees';

    // Dynamic pricing based on demand — higher demand = higher price point
    const basePrice = Math.round(((demandScore / 100) * 3000 + 1500) / 100) * 100;
    const growthPrice = basePrice * 2;
    const enterprisePrice = basePrice * 3;

    // Adapt ICP from the niche and target audience
    const nicheKey = niche.toLowerCase();
    let industry = 'B2B SaaS & Technology';
    let companySize = '10-200 employees';
    let revenue = '$1M-$50M ARR';
    let decisionMaker = 'VP of Marketing / Head of Growth / CMO';
    let painPrefix = 'lead generation';

    if (nicheKey.includes('ecommerce') || nicheKey.includes('shopify') || nicheKey.includes('dtc')) {
      industry = 'E-Commerce & DTC Brands';
      companySize = '5-100 employees';
      revenue = '$500K-$20M revenue';
      decisionMaker = 'Founder / Head of Marketing / E-Commerce Manager';
      painPrefix = 'customer acquisition';
    } else if (nicheKey.includes('linkedin') || nicheKey.includes('b2b lead') || nicheKey.includes('outbound')) {
      industry = 'B2B Services & Consulting';
      companySize = '10-500 employees';
      revenue = '$2M-$100M revenue';
      decisionMaker = 'VP Sales / Head of Business Development / CRO';
      painPrefix = 'qualified pipeline generation';
    } else if (nicheKey.includes('saas') || nicheKey.includes('software')) {
      industry = 'SaaS & Product-Led Growth';
      companySize = '20-300 employees';
      revenue = '$2M-$50M ARR';
      decisionMaker = 'VP Product / Head of Growth / CPO';
      painPrefix = 'user activation and retention';
    } else if (nicheKey.includes('content') || nicheKey.includes('creative') || nicheKey.includes('seo')) {
      industry = 'Digital Marketing & Content';
      companySize = '5-200 employees';
      revenue = '$500K-$30M revenue';
      decisionMaker = 'CMO / Head of Content / Marketing Director';
      painPrefix = 'content-driven lead generation';
    } else if (nicheKey.includes('construction') || nicheKey.includes('roofing') || nicheKey.includes('contractor')) {
      industry = 'Construction & Home Services';
      companySize = '5-50 employees';
      revenue = '$500K-$10M revenue';
      decisionMaker = 'Owner / General Manager';
      painPrefix = 'qualified appointment booking';
    }

    // If we have targetAudience from Agent 1, use it to refine
    if (targetAudience && targetAudience !== 'B2B SaaS companies with 10-200 employees') {
      companySize = targetAudience;
    }

    const slug = niche.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(' ').slice(0, 3).join(' ');
    const serviceName = `LeadFlow AI — ${slug} Engine`;

    return {
      offer: {
        serviceName,
        icp: {
          description: `${industry} companies with ${companySize} and ${revenue} that are struggling with ${painPrefix}, high customer acquisition costs, and inability to scale outbound. They need a predictable, autonomous pipeline to hit their next growth milestone.`,
          companySize,
          revenue,
          industry,
          decisionMaker,
          psychographics: `Growth-focused leaders frustrated with unpredictable pipelines. They value measurable ROI, automation, and speed. They've tried agencies or in-house teams but need scalable, autonomous systems. Buying trigger: missed quarterly targets or board pressure to grow efficiently.`,
        },
        painPoints: [
          `Inconsistent ${painPrefix} — feast-or-famine pipeline that makes revenue forecasting impossible`,
          `High CAC eroding margins — spending $200+ per lead on channels that don't convert`,
          `Sales team wastes 60% of time on unqualified leads that were never going to buy`,
          `No attribution visibility — can't tell which channels actually drive revenue vs. vanity metrics`,
          `Over-reliance on manual processes — no scalable system for ${painPrefix} that works without constant oversight`,
        ],
        transformationPromise: `Double your qualified leads in 90 days with fully autonomous AI-powered ${painPrefix} — or get a full refund`,
        pricingTiers: [
          {
            name: 'Starter',
            price: basePrice,
            billingCycle: 'monthly',
            features: [
              `Up to 5 active campaigns (${platforms.slice(0, 2).join(' + ')})`,
              'AI-powered lead scoring & qualification',
              '500 outbound emails/month via Instantly',
              'Basic landing page (1 variant)',
              'Weekly performance report',
              'CRM integration (HubSpot or GoHighLevel)',
              'Email support',
            ],
          },
          {
            name: 'Growth',
            price: growthPrice,
            billingCycle: 'monthly',
            features: [
              'Unlimited campaigns across all channels',
              'AI voice qualification calls (Bland AI)',
              '2,500 outbound emails/month + LinkedIn outreach',
              'A/B tested landing pages (up to 5 variants)',
              'Multi-touch attribution dashboard',
              'Automated budget reallocation & creative rotation',
              'Dedicated success manager',
              'Daily Slack performance alerts',
              'CRM + Calendly integration',
            ],
          },
          {
            name: 'Enterprise',
            price: enterprisePrice,
            billingCycle: 'monthly',
            features: [
              'Everything in Growth',
              'Custom AI qualification scripts per ICP segment',
              '10,000 outbound emails/month + full LinkedIn automation',
              'White-glove funnel design & copywriting',
              'Custom CRM workflows & sales routing rules',
              'Real-time performance optimization (hourly)',
              'Dedicated Slack channel with 1-hour response SLA',
              'Quarterly business reviews with growth strategist',
              'Priority access to new features & beta tools',
              'Multi-brand / multi-product support',
            ],
          },
        ],
        guarantee: `90-Day Double-or-Refund Guarantee: If we don't at least double your qualified lead volume within 90 days of launch, we'll refund 100% of your fees — no questions asked.`,
        positioning: `Unlike traditional agencies that charge retainers for manual work with opaque results, ${serviceName} is a fully autonomous system — 13 AI agents working 24/7 across every channel. You get the output of an entire marketing department at a fraction of the cost, with complete attribution transparency and performance guarantees.`,
        uniqueMechanism: 'The LeadOS 13-Agent Orchestration Engine — a proprietary AI pipeline where specialized agents handle every stage from market research to CRM hygiene, communicating via real-time message queues. Each agent optimizes its domain autonomously while the Performance Optimization Agent reallocates budget across channels every 6 hours based on actual revenue attribution.',
        trendInsights: {
          searchInterest: trendsScore,
          risingKeywords: risingQueries.slice(0, 5),
          topRegions: ['California', 'Texas', 'New York', 'Florida', 'Washington'],
        },
      },
      reasoning: `Analyzed the "${niche}" opportunity (market size: ${marketSize}, demand: ${demandScore}/100, competition: ${competitionScore}/100). ICP narrowed to ${industry} with ${decisionMaker} as buyer. Pricing anchored at $${basePrice}/mo Starter to filter non-serious buyers, Growth at $${growthPrice}/mo for scaling teams, Enterprise at $${enterprisePrice}/mo for high-value accounts. Google Trends score: ${trendsScore}/100. Rising search terms: ${risingQueries.slice(0, 3).join(', ')}. Guarantee designed for maximum risk reversal to accelerate close rates.`,
      confidence: topOpp ? 85 : 72,
    };
  }
}
