import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';

const SYSTEM_PROMPT = `You are the Offer Engineering Agent for LeadOS — the Service Acquisition Machine. Your job is to take a validated service opportunity and package it into a compelling, market-ready offer.

You receive JSON input containing:
- Service research data (niche, demand/competition/monetization scores, market size)
- Google Trends data (search interest, rising queries, regional interest)
- Target focus area and region
- Any previous pipeline outputs

Use Google Trends data to:
- Validate market demand with real search volume signals
- Identify rising queries to incorporate into messaging and positioning
- Target high-interest regions for geo-focused campaigns
- Craft transformation promises that align with actual search intent

Your responsibilities:
1. DEFINE THE ICP (Ideal Customer Profile): Company size, revenue range, industry vertical, decision-maker title, psychographics, and buying triggers.
2. IDENTIFY PAIN POINTS: Extract the top 5 pain points your ICP faces that this service solves. Be specific and emotionally resonant.
3. CRAFT THE TRANSFORMATION PROMISE: A single, measurable promise that makes the offer irresistible (e.g., "Double your qualified leads in 90 days").
4. SET PRICING TIERS: Create 3 tiers (Starter, Growth, Enterprise) with monthly billing. Each tier must have a clear price point, feature set, and logical upgrade path. Price anchoring: Enterprise should be 3-4x Starter.
5. CREATE A GUARANTEE: A risk-reversal guarantee that removes buyer hesitation (e.g., performance-based, money-back, or hybrid).
6. POSITIONING & UNIQUE MECHANISM: Define how this offer is different from competitors. The unique mechanism is the proprietary method or technology that makes the promise believable.

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
    "painPoints": ["string — 5 specific pain points"],
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
  "reasoning": "string — explain your offer engineering decisions",
  "confidence": "number 0-100"
}`;

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

    try {
      const userMessage = JSON.stringify({
        ...inputs.config,
        previousOutputs: inputs.previousOutputs || {},
      });
      const response = await this.callClaude(SYSTEM_PROMPT, userMessage);
      const parsed = this.safeParseLLMJson<any>(response, ['offer']);
      this.status = 'done';
      await this.log('run_completed', { output: parsed });
      return {
        success: true,
        data: parsed,
        reasoning: parsed.reasoning || 'Offer engineering complete',
        confidence: parsed.confidence || 85,
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
    const serviceResearch = inputs.previousOutputs?.['service-research'];
    const topOpp = serviceResearch?.data?.opportunities?.[0];
    const niche = topOpp?.niche || 'AI-Powered Content Marketing';
    const marketSize = topOpp?.estimatedMarketSize || '$4.2B';
    const risingQueries = topOpp?.risingQueries || ['AI lead generation', 'automated outbound', 'B2B sales automation'];
    const trendsScore = topOpp?.googleTrendsScore || 78;
    const platforms = topOpp?.targetPlatforms || ['LinkedIn', 'Google Ads'];

    // Adapt ICP based on niche
    const nicheConfigs: Record<string, { industry: string; companySize: string; revenue: string; decisionMaker: string; painPrefix: string }> = {
      default: { industry: 'B2B SaaS & Technology', companySize: '10-200 employees', revenue: '$1M-$50M ARR', decisionMaker: 'VP of Marketing / Head of Growth / CMO', painPrefix: 'lead generation' },
    };

    const nicheKey = niche.toLowerCase();
    let config = nicheConfigs.default;
    if (nicheKey.includes('shopify') || nicheKey.includes('ecommerce') || nicheKey.includes('dtc')) {
      config = { industry: 'E-Commerce & DTC Brands', companySize: '5-100 employees', revenue: '$500K-$20M revenue', decisionMaker: 'Founder / Head of Marketing / E-Commerce Manager', painPrefix: 'customer acquisition' };
    } else if (nicheKey.includes('linkedin') || nicheKey.includes('b2b lead')) {
      config = { industry: 'B2B Services & Consulting', companySize: '10-500 employees', revenue: '$2M-$100M revenue', decisionMaker: 'VP Sales / Head of Business Development / CRO', painPrefix: 'qualified pipeline generation' };
    } else if (nicheKey.includes('saas') && nicheKey.includes('onboarding')) {
      config = { industry: 'SaaS & Product-Led Growth', companySize: '20-300 employees', revenue: '$2M-$50M ARR', decisionMaker: 'VP Product / Head of Growth / CPO', painPrefix: 'user activation and retention' };
    } else if (nicheKey.includes('content') || nicheKey.includes('creative')) {
      config = { industry: 'Digital Marketing & Content', companySize: '5-200 employees', revenue: '$500K-$30M revenue', decisionMaker: 'CMO / Head of Content / Marketing Director', painPrefix: 'content-driven lead generation' };
    } else if (nicheKey.includes('paid media') || nicheKey.includes('ads') || nicheKey.includes('traffic')) {
      config = { industry: 'Performance Marketing & Media Buying', companySize: '10-200 employees', revenue: '$1M-$50M revenue', decisionMaker: 'VP Marketing / Performance Marketing Manager / CMO', painPrefix: 'paid acquisition at scale' };
    }

    const slug = niche.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(' ').slice(0, 3).join(' ');
    const serviceName = `LeadFlow AI — ${slug} Engine`;

    return {
      offer: {
        serviceName,
        icp: {
          description: `${config.industry} companies with ${config.companySize} and ${config.revenue} that are struggling with ${config.painPrefix}, high customer acquisition costs, and inability to scale outbound. They need a predictable, autonomous pipeline to hit their next growth milestone.`,
          companySize: config.companySize,
          revenue: config.revenue,
          industry: config.industry,
          decisionMaker: config.decisionMaker,
        },
        painPoints: [
          `Inconsistent ${config.painPrefix} — feast-or-famine pipeline that makes revenue forecasting impossible`,
          'High CAC that erodes margins — spending $200+ per lead on channels that don\'t convert',
          'Sales team wastes 60% of time on unqualified leads that were never going to buy',
          'No attribution visibility — can\'t tell which channels actually drive revenue vs. vanity metrics',
          `Over-reliance on manual processes — no scalable system for ${config.painPrefix}`,
        ],
        transformationPromise: `Double your qualified leads in 90 days with fully autonomous AI-powered ${config.painPrefix} — or get a full refund`,
        pricingTiers: [
          {
            name: 'Starter',
            price: 2997,
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
            price: 5997,
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
            price: 9997,
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
          risingKeywords: risingQueries,
          topRegions: ['California', 'Texas', 'New York', 'Florida', 'Washington'],
        },
      },
      reasoning: `Analyzed the "${niche}" opportunity (market size: ${marketSize}). ICP narrowed to ${config.industry} with ${config.decisionMaker} as buyer. Pricing anchored at $2,997 Starter to filter non-serious buyers while Enterprise at $9,997 captures high-value accounts. Google Trends score of ${trendsScore}/100 with rising queries: ${risingQueries.join(', ')}.`,
      confidence: 88,
    };
  }
}
