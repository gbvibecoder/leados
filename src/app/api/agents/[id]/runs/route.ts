import { NextResponse } from 'next/server';
import { fetchRealTrends } from '@/lib/real-trends';

export const dynamic = 'force-dynamic';

// Rich mock data for each agent that matches their actual output schemas
const agentMockOutputs: Record<string, any> = {
  // Service Research now uses LIVE data - see special handling below
  'service-research-fallback': {
    success: true,
    data: {
      opportunities: [
        {
          niche: 'AI-Powered Lead Generation',
          demandScore: 94,
          competitionScore: 32,
          monetizationScore: 91,
          compositeScore: 87.1,
          reasoning: 'Explosive growth in AI adoption for sales automation. Reddit r/sales and r/SaaS show 340% increase in discussions. Low agency competition — most still manual.',
          estimatedMarketSize: '$4.8B',
          targetPlatforms: ['LinkedIn', 'Google Ads', 'Reddit'],
          trendData: {
            redditMentions: 2847,
            googleTrendsIndex: 89,
            jobPostings: 1243,
            growthRate: '+127% YoY'
          }
        },
        {
          niche: 'Fractional CMO Services',
          demandScore: 88,
          competitionScore: 41,
          monetizationScore: 95,
          compositeScore: 83.8,
          reasoning: 'High demand from Series A/B startups needing strategic marketing leadership without full-time CMO cost. Adzuna shows 890 open roles.',
          estimatedMarketSize: '$2.1B',
          targetPlatforms: ['LinkedIn', 'Twitter/X'],
          trendData: {
            redditMentions: 1523,
            googleTrendsIndex: 76,
            jobPostings: 890,
            growthRate: '+89% YoY'
          }
        },
        {
          niche: 'B2B Cold Email Infrastructure',
          demandScore: 91,
          competitionScore: 48,
          monetizationScore: 87,
          compositeScore: 82.3,
          reasoning: 'Deliverability crisis driving demand for managed email infrastructure. r/coldoutreach discussions up 200%. Technical moat opportunity.',
          estimatedMarketSize: '$1.9B',
          targetPlatforms: ['Reddit', 'Hacker News', 'LinkedIn'],
          trendData: {
            redditMentions: 3241,
            googleTrendsIndex: 82,
            jobPostings: 567,
            growthRate: '+156% YoY'
          }
        },
        {
          niche: 'RevOps Automation Consulting',
          demandScore: 85,
          competitionScore: 35,
          monetizationScore: 89,
          compositeScore: 80.6,
          reasoning: 'Revenue Operations becoming critical function. Low consultant saturation, high willingness to pay for HubSpot/Salesforce expertise.',
          estimatedMarketSize: '$3.4B',
          targetPlatforms: ['LinkedIn', 'Google Ads'],
          trendData: {
            redditMentions: 892,
            googleTrendsIndex: 71,
            jobPostings: 2134,
            growthRate: '+94% YoY'
          }
        },
        {
          niche: 'AI Video Production Agency',
          demandScore: 92,
          competitionScore: 52,
          monetizationScore: 78,
          compositeScore: 76.2,
          reasoning: 'Sora/Runway adoption creating demand for AI video services. Early mover advantage available. Competition rising fast.',
          estimatedMarketSize: '$5.2B',
          targetPlatforms: ['YouTube', 'TikTok', 'LinkedIn'],
          trendData: {
            redditMentions: 4521,
            googleTrendsIndex: 95,
            jobPostings: 723,
            growthRate: '+312% YoY'
          }
        }
      ],
      dataSources: {
        reddit: { subreddits: ['r/sales', 'r/SaaS', 'r/Entrepreneur', 'r/marketing'], postsAnalyzed: 12847 },
        hackerNews: { storiesAnalyzed: 543, commentsAnalyzed: 8921 },
        googleTrends: { keywordsTracked: 24, timeframe: '12 months' },
        jobBoards: { source: 'Adzuna + HN Who\'s Hiring', listingsAnalyzed: 4521 }
      }
    },
    reasoning: 'Analyzed 12,847 Reddit posts, 543 HN stories, 24 Google Trends keywords, and 4,521 job listings. AI-Powered Lead Generation ranks #1 with composite score 87.1 — driven by explosive demand (94), low competition (32), and strong monetization potential (91). All top 5 opportunities show >75% YoY growth.',
    confidence: 93
  },

  'offer-engineering': {
    success: true,
    data: {
      offer: {
        serviceName: 'LeadFlow AI — Autonomous Lead Generation Engine',
        icp: {
          description: 'B2B SaaS companies with 10-200 employees and $1M-$50M ARR struggling with inconsistent lead flow, high CAC, and founder-led sales bottleneck. They have product-market fit but need predictable pipeline to hit next growth milestone.',
          companySize: '10-200 employees',
          revenue: '$1M-$50M ARR',
          industry: 'B2B SaaS & Technology',
          decisionMaker: 'VP of Marketing / Head of Growth / CMO',
          psychographics: 'Data-driven, growth-obsessed, frustrated with agency opacity'
        },
        painPoints: [
          'Inconsistent lead flow — feast-or-famine pipeline makes revenue forecasting impossible',
          'High CAC eroding margins — spending $200+ per lead on channels that don\'t convert',
          'Sales team wastes 60% of time on unqualified leads that were never going to buy',
          'No attribution visibility — can\'t tell which channels actually drive revenue vs. vanity metrics',
          'Founder-led sales bottleneck — CEO still closes most deals because no repeatable system exists'
        ],
        transformationPromise: 'Double your qualified leads in 90 days with fully autonomous AI-powered lead generation — or get a full refund',
        pricingTiers: [
          {
            name: 'Starter',
            price: 2997,
            billingCycle: 'monthly',
            features: [
              'Up to 5 active campaigns (Google Ads + Meta)',
              'AI-powered lead scoring & qualification',
              '500 outbound emails/month via Instantly',
              'Basic landing page (1 variant)',
              'Weekly performance report',
              'CRM integration (HubSpot or GoHighLevel)',
              'Email support'
            ]
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
              'Automated budget reallocation',
              'Dedicated success manager',
              'Daily Slack performance alerts'
            ]
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
              'Custom CRM workflows & sales routing',
              'Real-time performance optimization (hourly)',
              'Dedicated Slack channel with 1-hour SLA',
              'Quarterly business reviews'
            ]
          }
        ],
        guarantee: '90-Day Double-or-Refund Guarantee: If we don\'t at least double your qualified lead volume within 90 days of launch, we\'ll refund 100% of your fees — no questions asked.',
        positioning: 'Unlike traditional agencies that charge retainers for manual work with opaque results, LeadFlow AI is a fully autonomous system — 13 AI agents working 24/7 across every channel.',
        uniqueMechanism: 'The LeadOS 13-Agent Orchestration Engine — a proprietary AI pipeline where specialized agents handle every stage from market research to CRM hygiene, optimizing autonomously.'
      }
    },
    reasoning: 'Analyzed service research data showing AI Lead Generation as top opportunity. ICP narrowed to B2B SaaS ($1M-$50M ARR) for highest LTV. Pricing anchored at $2,997/mo Starter to filter non-serious buyers, Enterprise at $9,997 for high-value accounts. 90-day guarantee removes risk and accelerates decisions.',
    confidence: 88
  },

  'validation': {
    success: true,
    data: {
      decision: 'GO',
      scores: {
        marketDemand: 88,
        competitiveSaturation: 35,
        pricingFeasibility: 92,
        cacVsLtv: 95
      },
      cacEstimate: 127.80,
      ltvEstimate: 4500,
      ltvCacRatio: 35.2,
      riskScore: 22,
      riskFactors: [
        {
          factor: 'AI lead generation is an emerging category — buyer education may be required',
          severity: 'medium',
          mitigation: 'Lead with case studies and ROI calculators in the funnel. Use comparison pages against traditional agencies.'
        },
        {
          factor: 'Pricing at $2,997/mo Starter may exclude early-stage startups',
          severity: 'low',
          mitigation: 'Accepted trade-off: higher price filters for serious buyers with budget, improving lead quality.'
        },
        {
          factor: 'Dependence on third-party APIs (Google Ads, Meta, Instantly) introduces platform risk',
          severity: 'medium',
          mitigation: 'Abstraction layer built into LeadOS architecture. Can swap providers without business logic changes.'
        },
        {
          factor: '90-day money-back guarantee creates cash flow risk if early cohorts underperform',
          severity: 'high',
          mitigation: 'Set aside 20% reserve fund for first 6 months. Monitor guarantee claim rate weekly.'
        }
      ]
    },
    reasoning: 'LeadFlow AI passes all validation gates. Market demand score of 88 reflects strong interest in AI-powered lead generation (Google Trends +340% YoY). Competitive saturation low at 35 — most agencies still rely on manual processes. LTV/CAC ratio of 35.2x is exceptional (threshold is 3x). Risk score of 22 is within acceptable range. PROCEED to funnel build.',
    confidence: 91
  },

  'funnel-builder': {
    success: true,
    data: {
      funnel: {
        name: 'LeadFlow AI — High-Converting Lead Funnel',
        pages: [
          {
            type: 'landing',
            name: 'Main Landing Page',
            url: '/leadflow-ai',
            conversionGoal: 'Book Demo Call',
            elements: ['Hero with promise', 'Social proof bar', 'Pain points section', '3-tier pricing', 'ROI calculator', 'FAQ', 'Final CTA']
          },
          {
            type: 'booking',
            name: 'Demo Booking Page',
            url: '/leadflow-ai/demo',
            integration: 'Calendly',
            conversionGoal: 'Scheduled Call'
          },
          {
            type: 'thank-you',
            name: 'Confirmation Page',
            url: '/leadflow-ai/thank-you',
            elements: ['Confirmation message', 'Pre-call video', 'Case study download']
          }
        ],
        tracking: {
          ga4: true,
          metaPixel: true,
          googleAds: true,
          utmParams: ['source', 'medium', 'campaign', 'content', 'term']
        },
        deployTarget: 'Webflow'
      },
      copyBlocks: {
        headline: 'Double Your Qualified Leads in 90 Days — Or Your Money Back',
        subheadline: '13 AI agents working 24/7 to fill your pipeline with buyers ready to close',
        cta: 'Book Your Strategy Call →'
      }
    },
    reasoning: 'Built conversion-optimized funnel based on Offer Engineering output. 3-page structure (landing → booking → thank-you) minimizes friction. ROI calculator adds interactivity. Full tracking stack enables attribution.',
    confidence: 89
  },

  'content-creative': {
    success: true,
    data: {
      assets: {
        adCopy: [
          {
            platform: 'Google Ads',
            type: 'Responsive Search Ad',
            headlines: [
              'Double Your Leads in 90 Days',
              'AI Lead Generation That Works',
              '13 AI Agents, One Mission: Growth',
              'Tired of Expensive Agencies?',
              'Predictable Pipeline, Finally'
            ],
            descriptions: [
              'Stop wasting budget on leads that don\'t convert. Our AI qualification ensures you only talk to buyers ready to close.',
              'Full-funnel lead generation powered by 13 specialized AI agents. 90-day money-back guarantee.'
            ]
          },
          {
            platform: 'Meta',
            type: 'Primary Ad',
            headline: 'Your competitors are using AI to steal your leads',
            body: 'While you\'re paying $200+ per lead to agencies with "strategy calls" that go nowhere, AI-powered systems are generating qualified leads at $50 each.\n\nLeadFlow AI: 13 autonomous agents. 24/7 optimization. 90-day guarantee.\n\nBook a demo →',
            cta: 'Learn More'
          }
        ],
        emailSequence: [
          {
            day: 0,
            subject: 'Quick question about {{company}}\'s lead gen',
            preview: 'Noticed something interesting...',
            type: 'cold-outreach'
          },
          {
            day: 3,
            subject: 'The $200/lead problem (and how to fix it)',
            preview: 'Most B2B companies are overpaying...',
            type: 'value-add'
          },
          {
            day: 7,
            subject: 'Case study: {{similar_company}} doubled leads in 67 days',
            preview: 'Real results, not theory',
            type: 'social-proof'
          }
        ]
      },
      brandVoice: 'Confident, data-driven, slightly provocative. Challenge status quo without being aggressive.'
    },
    reasoning: 'Created multi-platform creative package targeting B2B SaaS ICP. Google Ads copy focuses on problem/solution. Meta ad uses competitive angle. Email sequence follows 3-touch pattern: curiosity → value → proof.',
    confidence: 86
  },

  'paid-traffic': {
    success: true,
    data: {
      campaigns: [
        {
          platform: 'Google Ads',
          name: 'LeadFlow AI - Search - Brand',
          type: 'Search',
          budget: 150,
          budgetPeriod: 'daily',
          status: 'active',
          targeting: {
            keywords: ['ai lead generation', 'automated lead gen', 'b2b lead generation software'],
            matchType: 'phrase',
            negatives: ['free', 'cheap', 'diy']
          },
          metrics: {
            impressions: 12453,
            clicks: 487,
            ctr: 3.91,
            cpc: 4.23,
            conversions: 23,
            conversionRate: 4.72,
            costPerConversion: 89.52
          }
        },
        {
          platform: 'Meta',
          name: 'LeadFlow AI - Lookalike - Demo Bookers',
          type: 'Conversions',
          budget: 200,
          budgetPeriod: 'daily',
          status: 'active',
          targeting: {
            audience: '1% Lookalike - Demo Bookers',
            placements: ['Facebook Feed', 'Instagram Feed', 'Instagram Stories']
          },
          metrics: {
            impressions: 45231,
            clicks: 892,
            ctr: 1.97,
            cpc: 2.89,
            conversions: 31,
            conversionRate: 3.47,
            costPerConversion: 71.23
          }
        }
      ],
      totalBudget: { daily: 350, monthly: 10500 },
      projectedMetrics: {
        monthlyLeads: 162,
        avgCpl: 64.81,
        projectedRevenue: 48600
      }
    },
    reasoning: 'Launched 2 primary campaigns across Google Ads (search intent) and Meta (lookalike expansion). Budget split 43/57 based on historical performance data. CPL trending 35% below industry average.',
    confidence: 84
  },

  'outbound-outreach': {
    success: true,
    data: {
      sequences: [
        {
          name: 'Cold Outreach - VP Marketing',
          platform: 'Instantly',
          status: 'active',
          contacts: 2500,
          steps: 5,
          metrics: {
            sent: 2500,
            delivered: 2375,
            opened: 1187,
            openRate: 49.98,
            replied: 142,
            replyRate: 5.98,
            meetings: 28,
            meetingRate: 1.18
          }
        },
        {
          name: 'LinkedIn Connection + Message',
          platform: 'LinkedIn Sales Navigator',
          status: 'active',
          contacts: 500,
          steps: 3,
          metrics: {
            connectionsSent: 500,
            accepted: 185,
            acceptRate: 37.0,
            messaged: 185,
            replied: 47,
            replyRate: 25.41,
            meetings: 12,
            meetingRate: 6.49
          }
        }
      ],
      totalMeetingsBooked: 40,
      costPerMeeting: 23.50
    },
    reasoning: 'Running dual-channel outbound via Instantly (email) and LinkedIn. Email sequence achieving 5.98% reply rate (2x industry average). LinkedIn connection-first approach yielding 25% reply rate. Combined 40 meetings booked this month.',
    confidence: 87
  },

  'inbound-capture': {
    success: true,
    data: {
      sources: [
        { name: 'Landing Page Form', leads: 89, conversionRate: 4.2 },
        { name: 'Chatbot Widget', leads: 34, conversionRate: 2.8 },
        { name: 'Demo Booking Page', leads: 52, conversionRate: 12.1 },
        { name: 'Content Download', leads: 127, conversionRate: 8.4 }
      ],
      totalLeads: 302,
      enrichedLeads: 287,
      enrichmentRate: 95.03,
      enrichmentSources: ['Apollo.io', 'Clearbit', 'LinkedIn'],
      dataPoints: {
        avgFieldsFilled: 12,
        companyDataFound: 94.2,
        emailVerified: 98.1
      }
    },
    reasoning: 'Captured 302 inbound leads across 4 sources. Demo booking page highest conversion at 12.1%. 95% enrichment rate via Apollo + Clearbit integration. All leads tagged with UTM source for attribution.',
    confidence: 90
  },

  'qualification': {
    success: true,
    data: {
      callsCompleted: 89,
      qualifiedLeads: 34,
      qualificationRate: 38.2,
      avgCallDuration: '4:23',
      bantScores: {
        avgBudget: 72,
        avgAuthority: 81,
        avgNeed: 88,
        avgTimeline: 65
      },
      outcomes: {
        qualified: 34,
        nurture: 31,
        disqualified: 24
      },
      topDisqualReasons: [
        { reason: 'Budget too low', count: 12 },
        { reason: 'No decision-making authority', count: 7 },
        { reason: 'Timeline > 6 months', count: 5 }
      ],
      aiVoiceProvider: 'Bland AI'
    },
    reasoning: 'Completed 89 AI qualification calls via Bland AI. 38.2% qualification rate — above 35% target. BANT scoring shows strong Need (88) but Timeline (65) is opportunity for nurture sequences. 31 leads moved to nurture track.',
    confidence: 88
  },

  'sales-routing': {
    success: true,
    data: {
      leadsRouted: 34,
      routingRules: [
        { name: 'Enterprise Tier', criteria: 'Revenue > $10M', assignTo: 'Senior AE Team', count: 8 },
        { name: 'Growth Tier', criteria: 'Revenue $1M-$10M', assignTo: 'Growth AE Team', count: 19 },
        { name: 'Starter Tier', criteria: 'Revenue < $1M', assignTo: 'SDR Team', count: 7 }
      ],
      avgTimeToAssignment: '2.3 minutes',
      slaCompliance: 98.2,
      repPerformance: [
        { name: 'Alex M.', assigned: 12, closed: 4, closeRate: 33.3 },
        { name: 'Sarah K.', assigned: 11, closed: 5, closeRate: 45.5 },
        { name: 'Mike R.', assigned: 11, closed: 3, closeRate: 27.3 }
      ]
    },
    reasoning: 'Routed 34 qualified leads using tiered rules based on company revenue. 98.2% SLA compliance (< 5 min assignment). Sarah K. leading close rate at 45.5% — analyzing her approach for team training.',
    confidence: 85
  },

  'tracking-attribution': {
    success: true,
    data: {
      touchpoints: {
        firstTouch: { 'Google Ads': 42, 'Meta': 31, 'LinkedIn': 18, 'Organic': 9 },
        lastTouch: { 'Demo Page': 52, 'Email': 28, 'LinkedIn': 12, 'Direct': 8 }
      },
      multiTouchModel: 'Linear',
      channelPerformance: [
        { channel: 'Google Ads', spend: 4500, revenue: 29700, roas: 6.6, attributed: 12 },
        { channel: 'Meta', spend: 6000, revenue: 23400, roas: 3.9, attributed: 9 },
        { channel: 'Outbound Email', spend: 800, revenue: 18000, roas: 22.5, attributed: 6 },
        { channel: 'LinkedIn', spend: 1200, revenue: 12600, roas: 10.5, attributed: 4 }
      ],
      conversionPaths: {
        avgTouchpoints: 4.2,
        avgDaysToConvert: 18,
        topPath: 'Google Ads → Landing Page → Email Nurture → Demo → Close'
      }
    },
    reasoning: 'Multi-touch attribution reveals outbound email has highest ROAS (22.5x) despite lowest spend. Google Ads drives most first-touch volume. Avg 4.2 touchpoints before conversion suggests strong nurture importance.',
    confidence: 89
  },

  'performance-optimization': {
    success: true,
    data: {
      optimizationsApplied: [
        {
          type: 'Budget Reallocation',
          action: 'Shifted $1,500/mo from Meta to Google Ads',
          impact: '+12% ROAS',
          timestamp: '2026-03-08T06:00:00Z'
        },
        {
          type: 'Creative Rotation',
          action: 'Paused underperforming ad (CTR < 1%)',
          impact: '+0.8% avg CTR',
          timestamp: '2026-03-07T12:00:00Z'
        },
        {
          type: 'Bid Adjustment',
          action: 'Increased bids on "ai lead generation" +20%',
          impact: '+15 conversions/week',
          timestamp: '2026-03-06T18:00:00Z'
        }
      ],
      currentMetrics: {
        blendedCpl: 64.81,
        blendedRoas: 7.2,
        monthlyLeads: 162,
        monthlyRevenue: 83700
      },
      recommendations: [
        'Scale Google Ads budget by 30% — headroom before diminishing returns',
        'Test new LinkedIn ad format (Document Ads) for thought leadership angle',
        'A/B test landing page with video hero vs. static'
      ]
    },
    reasoning: 'Applied 3 optimizations this week. Budget reallocation from Meta → Google Ads yielded 12% ROAS improvement. Blended CPL at $64.81 is 35% below target. Recommending 30% Google Ads scale.',
    confidence: 87
  },

  'crm-hygiene': {
    success: true,
    data: {
      recordsProcessed: 4521,
      duplicatesFound: 89,
      duplicatesMerged: 89,
      deduplicationRate: 99.8,
      dataEnrichment: {
        recordsEnriched: 234,
        fieldsUpdated: 1872,
        sources: ['Apollo.io', 'Clearbit', 'LinkedIn']
      },
      lifecycleUpdates: {
        movedToMql: 45,
        movedToSql: 28,
        movedToOpportunity: 12,
        movedToCustomer: 4,
        movedToChurned: 2
      },
      dataQualityScore: 94.2,
      issuesFixed: [
        { type: 'Invalid email format', count: 23 },
        { type: 'Missing company name', count: 12 },
        { type: 'Outdated job title', count: 45 }
      ]
    },
    reasoning: 'Processed 4,521 CRM records. Merged 89 duplicates (99.8% deduplication). Enriched 234 records with fresh data. Data quality score improved from 87.3% to 94.2%. Lifecycle stage updates applied automatically.',
    confidence: 92
  }
};

// Default mock output for unknown agents
const defaultMockOutput = {
  success: true,
  data: {
    message: 'Agent execution completed successfully',
    processedItems: 142,
    status: 'optimal'
  },
  reasoning: 'Analysis complete. All checks passed.',
  confidence: 85
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // For service-research agent, fetch LIVE data from Reddit & Hacker News
  if (id === 'service-research') {
    try {
      const liveData = await fetchRealTrends('B2B services', 'US');

      return NextResponse.json([
        {
          id: `run_${id}_live`,
          agentId: id,
          status: 'done',
          outputsJson: {
            success: true,
            ...liveData,
            isLive: true,
          },
          startedAt: liveData.lastUpdated,
          completedAt: liveData.lastUpdated,
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch live trends:', error);
      // Fall back to mock data on error
      const fallbackOutput = agentMockOutputs['service-research-fallback'] || defaultMockOutput;
      return NextResponse.json([
        {
          id: `run_${id}_fallback`,
          agentId: id,
          status: 'done',
          outputsJson: fallbackOutput,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
      ]);
    }
  }

  // Get agent-specific mock output or use default for other agents
  const agentOutput = agentMockOutputs[id] || defaultMockOutput;

  return NextResponse.json([
    {
      id: `run_${id}_001`,
      agentId: id,
      status: 'done',
      outputsJson: agentOutput,
      startedAt: '2026-03-08T14:00:00Z',
      completedAt: '2026-03-08T14:02:30Z',
    },
    {
      id: `run_${id}_002`,
      agentId: id,
      status: 'done',
      outputsJson: {
        ...agentOutput,
        confidence: Math.max(70, (agentOutput.confidence || 85) - 5),
        reasoning: `Previous run: ${agentOutput.reasoning?.substring(0, 100) || 'Analysis complete'}...`
      },
      startedAt: '2026-03-07T10:00:00Z',
      completedAt: '2026-03-07T10:01:45Z',
    },
  ]);
}
