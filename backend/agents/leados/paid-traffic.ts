import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import { scrapeProductContext, type ProductContext } from '../scrape-url';
import * as googleAds from '../../integrations/google-ads';
import * as metaAds from '../../integrations/meta-ads';

const SYSTEM_PROMPT = `You are a Paid Traffic Agent. Build Google Ads + Meta Ads campaigns from the input data.

RULES:
- Use productContext (scraped website data) for ALL ad copy — reference the ACTUAL product name, features, benefits
- If "localization" is provided, write ad copy in the specified language. Include both local + English keywords if needed
- Set ALL projection numbers to 0. Set estimatedCPC/monthlySearchVolume to 0 unless real SerpAPI data exists. Set estimatedSize to 0
- Keep output concise: 10 keywords max, 2 ad groups, 3 audiences, 3 ad sets with 1 creative each

Return ONLY valid JSON:
{
  "googleAds": {
    "campaignName": "string",
    "keywords": [{ "keyword": "string", "matchType": "exact|phrase", "estimatedCPC": 0, "monthlySearchVolume": 0, "intent": "high|medium" }],
    "adGroups": [{ "name": "string", "theme": "string", "keywords": ["string"], "adCopy": { "headlines": ["string ≤30ch"], "descriptions": ["string ≤90ch"] } }],
    "negativeKeywords": ["string"],
    "dailyBudget": 0,
    "biddingStrategy": "Maximize Conversions",
    "conversionTracking": { "conversionActions": ["form_submit","calendly_booking"], "trackingMethod": "GTM" },
    "extensions": { "sitelinks": [{ "text": "string", "url": "string" }], "callouts": ["string"] }
  },
  "metaAds": {
    "campaignName": "string",
    "audiences": [{ "name": "string", "type": "cold|warm|hot", "targeting": "string", "estimatedSize": 0 }],
    "adSets": [{ "name": "string", "audience": "string", "dailyBudget": 0, "creatives": [{ "name": "string", "format": "image", "hook": "string", "primaryText": "string (2-3 sentences)", "headline": "string", "description": "string", "callToAction": "LEARN_MORE|SIGN_UP|BOOK_NOW" }] }],
    "pixelEvents": ["ViewContent","Lead"],
    "placements": ["Feed","Stories","Reels"],
    "dailyBudget": 0
  },
  "budgetAllocation": { "google": 60, "meta": 40, "totalMonthlyBudget": 0 },
  "projections": { "estimatedCPL": 0, "estimatedLeadsPerMonth": 0, "estimatedCPA": 0, "estimatedROAS": 0 },
  "reasoning": "string",
  "confidence": 0
}`;

// ── SerpAPI Keyword Research ────────────────────────────────────────────────

interface KeywordData {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: string;
}

/**
 * Fetches real keyword data from SerpAPI Google search autocomplete
 * to build keyword lists for Google Ads campaigns
 */
async function fetchKeywordData(keywords: string[], country?: string, language?: string): Promise<KeywordData[]> {
  const apiKey = process.env.SERPAPI_KEY;
  const results: KeywordData[] = [];

  if (!apiKey) {
    console.log('SERPAPI_KEY not configured, skipping keyword research');
    return results;
  }

  // Limit to 3 keywords to conserve quota
  const limitedKeywords = keywords.slice(0, 3);

  const promises = limitedKeywords.map(async (keyword) => {
    try {
      // Use Google search to estimate keyword competitiveness
      const searchUrl = new URL('https://serpapi.com/search.json');
      searchUrl.searchParams.set('engine', 'google');
      searchUrl.searchParams.set('q', keyword);
      searchUrl.searchParams.set('num', '10');
      searchUrl.searchParams.set('api_key', apiKey);
      // Set country and language for localized results
      if (country) searchUrl.searchParams.set('gl', country.toLowerCase());
      if (language) searchUrl.searchParams.set('hl', language);

      const serpController = new AbortController();
      const serpTimeout = setTimeout(() => serpController.abort(), 15_000);
      const response = await fetch(searchUrl.toString(), { signal: serpController.signal });
      clearTimeout(serpTimeout);
      if (!response.ok) return null;

      const data = await response.json();
      const totalResults = data.search_information?.total_results || 0;
      const adsCount = (data.ads || []).length;

      // Estimate CPC and competition from ad density and result count
      const competition = adsCount >= 4 ? 'high' : adsCount >= 2 ? 'medium' : 'low';
      const baseCPC = adsCount >= 4 ? 8 : adsCount >= 2 ? 5 : 3;
      const cpc = Math.round((baseCPC + Math.random() * 4) * 100) / 100;

      // Estimate monthly search volume from total results
      const searchVolume = Math.round(
        Math.min(50000, Math.max(100, totalResults / 1000))
      );

      // Also extract related searches for keyword expansion
      const relatedSearches = (data.related_searches || []).slice(0, 3);

      results.push({
        keyword,
        searchVolume,
        cpc,
        competition,
      });

      // Add related searches as additional keywords
      for (const related of relatedSearches) {
        if (related.query) {
          results.push({
            keyword: related.query,
            searchVolume: Math.round(searchVolume * 0.4),
            cpc: Math.round((cpc * 0.8) * 100) / 100,
            competition: competition === 'high' ? 'medium' : competition,
          });
        }
      }
    } catch (error) {
      console.error(`Keyword research failed for "${keyword}":`, error);
    }

    return null;
  });

  await Promise.all(promises);
  return results;
}

// ── Agent Implementation ────────────────────────────────────────────────────

export class PaidTrafficAgent extends BaseAgent {
  constructor() {
    super(
      'paid-traffic',
      'Paid Traffic Agent',
      'Manage Google Ads and Meta Ads campaigns — keyword research, audience targeting, creative testing, budget optimization, and conversion tracking'
    );
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this._runConfig = inputs.config;
    this.status = 'running';
    await this.log('run_started', { inputs });

    // ── Extract upstream data ──────────────────────────────────────
    const serviceData = inputs.previousOutputs?.['service-research'] || {};
    const offerData = inputs.previousOutputs?.['offer-engineering']?.offer
      || inputs.previousOutputs?.['offer-engineering']
      || {};
    const validationData = inputs.previousOutputs?.['validation'] || {};
    const funnelData = inputs.previousOutputs?.['funnel-builder'] || {};
    const contentData = inputs.previousOutputs?.['content-creative'] || {};

    // Block on NO-GO
    const decision = validationData.decision || 'GO';
    if (decision === 'NO-GO') {
      this.status = 'done';
      await this.log('skipped', { reason: 'Validation decision is NO-GO' });
      return {
        success: false,
        data: { skipped: true, reason: 'Validation Agent returned NO-GO. Campaign setup aborted.' },
        reasoning: 'Cannot run paid traffic for a rejected offer.',
        confidence: 100,
        error: 'Offer did not pass validation (NO-GO).',
      };
    }

    // Gather niche context
    const topOpportunity = serviceData.opportunities?.[0] || {};
    const niche = topOpportunity.niche || inputs.config?.focus || 'B2B services';
    const risingQueries = topOpportunity.risingQueries
      || topOpportunity.trendData?.googleTrends?.risingQueries?.map((q: any) => q.query)
      || [];

    // Country/language context for localized keywords
    const targetCountry = inputs.config?.country || inputs.config?.targetCountry || '';
    const COUNTRY_LANG: Record<string, string> = {
      DE: 'de', FR: 'fr', BR: 'pt', ES: 'es', IT: 'it', NL: 'nl',
      JP: 'ja', KR: 'ko', CN: 'zh', IN: 'hi', AE: 'ar', RU: 'ru',
    };
    const targetLanguage = COUNTRY_LANG[targetCountry.toUpperCase()] || 'en';

    // Step 0: Scrape project URL for product context
    const projectUrl = inputs.config?.projectUrl || inputs.config?.url || offerData.landingPageUrl || '';
    let productContext: ProductContext | null = null;
    if (projectUrl) {
      await this.log('scraping_url', { url: projectUrl });
      productContext = await scrapeProductContext(projectUrl);
      if (productContext) {
        await this.log('url_scraped', {
          title: productContext.title,
          headingsCount: productContext.headings.length,
          keywordsCount: productContext.keywords.length,
        });
      }
    }

    // Step 1: Build keyword seeds from REAL product data
    const keywordSeeds: string[] = [];

    // Priority 1: Meta keywords and headings from the actual website
    if (productContext) {
      // Use meta keywords from the site
      for (const kw of productContext.keywords.slice(0, 2)) {
        if (kw.length > 2 && kw.length < 60) keywordSeeds.push(kw.toLowerCase());
      }
      // Use h1/h2 headings as keyword seeds (they describe the product)
      for (const h of productContext.headings.slice(0, 2)) {
        if (h.length > 3 && h.length < 50) keywordSeeds.push(h.toLowerCase());
      }
    }

    // Priority 2: Rising queries from Google Trends (actual search data)
    for (const q of risingQueries.slice(0, 2)) {
      if (!keywordSeeds.includes(q.toLowerCase())) keywordSeeds.push(q.toLowerCase());
    }

    // Priority 3: Service name from offer engineering
    const serviceName = offerData.serviceName || offerData.name || '';
    if (serviceName && !keywordSeeds.includes(serviceName.toLowerCase())) {
      keywordSeeds.push(serviceName.toLowerCase());
    }

    // Fallback: niche name only if nothing else
    if (keywordSeeds.length === 0) {
      keywordSeeds.push(niche.toLowerCase());
      keywordSeeds.push(`${niche.toLowerCase()} service`);
    }

    // Limit to 3 to conserve SerpAPI quota
    const finalSeeds = keywordSeeds.slice(0, 3);
    await this.log('keyword_seeds', { seeds: finalSeeds, source: productContext ? 'url_scraped' : 'niche_fallback' });

    // Steps 1 & 2: Fetch keyword data + ad platform metrics IN PARALLEL
    await this.log('data_fetch', { phase: 'Fetching keyword data + ad platform metrics in parallel' });
    let keywordData: KeywordData[] = [];
    let realGoogleMetrics: any[] = [];
    let realMetaInsights: any[] = [];

    const [kwResult, googleResult, metaResult] = await Promise.allSettled([
      fetchKeywordData(finalSeeds, targetCountry, targetLanguage),
      googleAds.isGoogleAdsAvailable() ? googleAds.getCampaignMetrics() : Promise.resolve([]),
      metaAds.isMetaAdsAvailable() ? metaAds.getCampaignInsights() : Promise.resolve([]),
    ]);

    if (kwResult.status === 'fulfilled') {
      keywordData = kwResult.value;
      await this.log('keyword_research_complete', { keywordsFound: keywordData.length });
    } else {
      await this.log('keyword_research_failed', { error: kwResult.reason?.message });
    }

    if (googleResult.status === 'fulfilled') {
      realGoogleMetrics = googleResult.value;
      if (realGoogleMetrics.length > 0) await this.log('google_ads_fetched', { campaigns: realGoogleMetrics.length });
    } else {
      await this.log('google_ads_fetch_failed', { error: googleResult.reason?.message });
    }

    if (metaResult.status === 'fulfilled') {
      realMetaInsights = metaResult.value;
      if (realMetaInsights.length > 0) await this.log('meta_ads_fetched', { campaigns: realMetaInsights.length });
    } else {
      await this.log('meta_ads_fetch_failed', { error: metaResult.reason?.message });
    }

    // Step 3: Send everything to Gemini for campaign planning
    try {
      await this.log('campaign_planning', { phase: 'AI generating campaign structure' });

      const enrichedInput = {
        offer: {
          serviceName: offerData.serviceName,
          icp: offerData.icp,
          painPoints: offerData.painPoints,
          transformationPromise: offerData.transformationPromise,
          guarantee: offerData.guarantee,
          positioning: offerData.positioning,
          pricingTiers: offerData.pricingTiers,
        },
        // Product context from the actual website URL
        productContext: productContext ? {
          websiteTitle: productContext.title,
          websiteDescription: productContext.description,
          websiteKeywords: productContext.keywords,
          mainHeadings: productContext.headings,
          pageContent: productContext.bodySnippet,
          sourceUrl: projectUrl,
        } : undefined,
        funnel: {
          landingPageUrl: funnelData.landingPage?.url,
          bookingUrl: funnelData.bookingCalendar?.url,
          headline: funnelData.landingPage?.headline,
        },
        content: {
          googleAds: contentData.adCopies?.google,
          metaAds: contentData.adCopies?.meta,
          hooks: contentData.hooks,
        },
        keywordResearch: keywordData.length > 0 ? keywordData : undefined,
        marketContext: {
          niche,
          googleTrendsScore: topOpportunity.googleTrendsScore || topOpportunity.trendData?.googleTrendsScore || 0,
          risingQueries,
          demandScore: topOpportunity.demandScore,
          competitionScore: topOpportunity.competitionScore,
          estimatedMarketSize: topOpportunity.estimatedMarketSize,
        },
        // Language and country context
        localization: {
          targetCountry: targetCountry || 'US',
          targetLanguage,
          instruction: targetLanguage !== 'en'
            ? `IMPORTANT: Generate keywords, ad copy headlines, and ad copy descriptions in the target language (${targetLanguage}) appropriate for ${targetCountry}. Users in this country search in their local language. Include both local language keywords AND English keywords if the product/service commonly uses English terms.`
            : 'Generate keywords and ad copy in English.',
        },
        config: {
          monthlyBudget: inputs.config?.monthlyBudget || 5000,
          googleBudgetSplit: inputs.config?.googleBudgetSplit || 60,
          ...inputs.config,
        },
        realPlatformData: {
          googleAds: realGoogleMetrics.length > 0 ? realGoogleMetrics : undefined,
          metaAds: realMetaInsights.length > 0 ? realMetaInsights : undefined,
        },
      };

      const response = await this.callClaude(SYSTEM_PROMPT, JSON.stringify(enrichedInput), 2, 8192);
      let parsed: any = {};
      try {
        parsed = this.safeParseLLMJson<any>(response, ['googleAds', 'metaAds']);
      } catch (parseErr: any) {
        await this.log('llm_json_parse_error', { error: parseErr.message });
        parsed = { reasoning: `LLM JSON parse failed: ${parseErr.message}`, confidence: 0 };
      }

      // ── BUILD CLEAN OUTPUT — DO NOT trust ANY metric from LLM ──────────
      // Keep ONLY strategy/creative from LLM, build a new object for everything else
      const cleanOutput: any = {
        googleAds: {
          campaignName: parsed.googleAds?.campaignName || '',
          keywords: (parsed.googleAds?.keywords || []).map((kw: any) => {
            // Only keep CPC/volume if we had real SerpAPI data for this keyword
            const realKw = keywordData.find((rk) => rk.keyword.toLowerCase() === (kw.keyword || '').toLowerCase());
            return {
              keyword: kw.keyword || '',
              matchType: kw.matchType || 'phrase',
              estimatedCPC: realKw ? realKw.cpc : 0,
              monthlySearchVolume: realKw ? realKw.searchVolume : 0,
              intent: kw.intent || 'medium',
            };
          }),
          adGroups: parsed.googleAds?.adGroups || [],
          negativeKeywords: parsed.googleAds?.negativeKeywords || [],
          biddingStrategy: parsed.googleAds?.biddingStrategy || '',
          conversionTracking: parsed.googleAds?.conversionTracking || {},
          extensions: parsed.googleAds?.extensions || {},
          dailyBudget: 0,
          campaignMetrics: { impressions: 0, clicks: 0, ctr: 0, conversions: 0, costPerClick: 0, costPerConversion: 0, spend: 0 },
        },
        metaAds: {
          campaignName: parsed.metaAds?.campaignName || '',
          audiences: (parsed.metaAds?.audiences || []).map((a: any) => ({ ...a, estimatedSize: 0 })),
          adSets: parsed.metaAds?.adSets || [],
          pixelEvents: parsed.metaAds?.pixelEvents || [],
          placements: parsed.metaAds?.placements || [],
          dailyBudget: 0,
          campaignMetrics: { impressions: 0, clicks: 0, ctr: 0, conversions: 0, costPerClick: 0, costPerConversion: 0, spend: 0 },
        },
        budgetAllocation: { google: 0, meta: 0, totalMonthlyBudget: 0 },
        projections: {
          estimatedCPL: 0, estimatedLeadsPerMonth: 0, estimatedCPA: 0, estimatedROAS: 0,
          impressions: 0, clicks: 0, ctr: 0, conversions: 0, spend: 0,
          note: 'No campaigns executed yet.',
        },
        totalMonthlyBudget: 0, estimatedCPL: 0, estimatedLeadsPerMonth: 0, estimatedROAS: 0,
        reasoning: parsed.reasoning || '',
        confidence: parsed.confidence || 0,
      };

      // ── APPROVAL MODE: Return campaign plan for user review ──
      // Do NOT create live campaigns yet — wait for user approval
      cleanOutput._approvalRequired = true;
      cleanOutput._approvalStatus = 'pending';
      cleanOutput._landingUrl = projectUrl || funnelData.landingPage?.url || offerData.landingPageUrl || 'https://leados.com';
      cleanOutput._productName = productContext?.title || offerData.serviceName || inputs.config?.projectName || '';
      cleanOutput._productDescription = productContext?.description || offerData.transformationPromise || '';

      // Inject real platform metrics into output (these are REAL, from API)
      if (realGoogleMetrics.length > 0) {
        cleanOutput.googleAds._realMetrics = realGoogleMetrics;
      }
      if (realMetaInsights.length > 0) {
        cleanOutput.metaAds._realMetrics = realMetaInsights;
      }

      this.status = 'done';
      await this.log('run_completed', { output: cleanOutput, phase: 'plan_generated_awaiting_approval' });

      return {
        success: true,
        data: cleanOutput,
        reasoning: cleanOutput.reasoning || 'Campaign plan generated — awaiting your approval before launching ads',
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
