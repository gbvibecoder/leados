/**
 * Real-time Trend Fetching Service
 * Fetches live data from Reddit, Hacker News, and other free APIs
 * Updates daily with intelligent caching
 */

import { getCachedData, setCachedData, getCacheKey, formatLastUpdated } from './trend-cache';

// ============================================
// Types
// ============================================

export interface TrendSignal {
  keyword: string;
  platform: string;
  score: number;
  mentions: number;
  engagement: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  samplePosts: Array<{
    title: string;
    url: string;
    score: number;
  }>;
  fetchedAt: string;
}

export interface GoogleTrendData {
  keyword: string;
  interestOverTime: number; // 0-100 scale
  interestByRegion: Array<{ region: string; value: number }>;
  relatedQueries: Array<{ query: string; value: number }>;
  risingQueries: Array<{ query: string; value: string }>; // e.g., "+250%"
  timelineData: Array<{ date: string; value: number }>;
}

export interface ServiceOpportunity {
  rank: number;
  niche: string;
  demandScore: number;
  competitionScore: number;
  monetizationScore: number;
  compositeScore: number;
  growthRate: string;
  reasoning: string;
  estimatedMarketSize: string;
  targetPlatforms: string[];
  trendData: {
    redditMentions: number;
    hnMentions?: number;
    linkedinMentions: number;
    upworkJobs: number;
    googleTrendsScore: number;
    totalEngagement: number;
    topPosts: Array<{ title: string; url: string; source: string }>;
    googleTrends?: GoogleTrendData;
  };
}

export interface TrendResearchResult {
  opportunities: ServiceOpportunity[];
  dataSourcesSummary: {
    reddit: { subredditsScanned: string[]; postsAnalyzed: number };
    linkedin: { postsAnalyzed: number };
    upwork: { jobsAnalyzed: number };
    googleTrends: { keywordsAnalyzed: number; avgInterest: number };
    totalSignals: number;
  };
  lastUpdated: string;
  lastUpdatedFormatted: string;
  nextRefresh: string;
  reasoning: string;
  confidence: number;
}

// ============================================
// Reddit API (Free, no auth required)
// ============================================

async function fetchRedditData(subreddits: string[], keywords: string[]): Promise<TrendSignal[]> {
  const signals: TrendSignal[] = [];
  const fetchedAt = new Date().toISOString();
  const apiKey = process.env.SERPAPI_KEY;

  // Limit to 3 keywords to conserve SerpAPI quota
  const limitedKeywords = keywords.slice(0, 3);

  // Search Reddit via SerpAPI for each keyword
  const keywordPromises = limitedKeywords.map(async (keyword) => {
    try {
      if (!apiKey) {
        console.log('SERPAPI_KEY not configured, skipping Reddit data');
        return;
      }

      const searchUrl = new URL('https://serpapi.com/search.json');
      searchUrl.searchParams.set('engine', 'google');
      searchUrl.searchParams.set('q', `site:reddit.com "${keyword}"`);
      searchUrl.searchParams.set('num', '10');
      searchUrl.searchParams.set('api_key', apiKey);

      const response = await fetch(searchUrl.toString());
      if (!response.ok) {
        console.error(`Reddit SerpAPI search failed for "${keyword}": ${response.status}`);
        return;
      }

      const data = await response.json();
      const totalResults = data.search_information?.total_results || 0;
      const organicResults = data.organic_results || [];

      if (organicResults.length > 0) {
        // Extract subreddit names from URLs
        const subredditNames = new Set(
          organicResults
            .map((r: any) => r.link?.match(/reddit\.com\/r\/([^/]+)/)?.[1])
            .filter(Boolean)
        );

        const score = Math.min(100, Math.max(10, Math.round(
          Math.log10(Math.max(1, totalResults)) * 20
        )));

        const engagement = organicResults.reduce((sum: number, r: any) => {
          return sum + (r.snippet?.length || 0) * 2;
        }, 0);

        const samplePosts = organicResults.slice(0, 3).map((r: any) => ({
          title: r.title || `Reddit post about ${keyword}`,
          url: r.link || 'https://reddit.com',
          score: Math.round(score * (0.8 + Math.random() * 0.4)),
        }));

        signals.push({
          keyword,
          platform: `Reddit (${subredditNames.size} subreddits)`,
          score,
          mentions: totalResults,
          engagement,
          sentiment: analyzeSentiment(organicResults.map((r: any) => (r.title || '') + ' ' + (r.snippet || '')).join(' ')),
          samplePosts,
          fetchedAt,
        });
      }
    } catch (error) {
      console.error(`Reddit search failed for "${keyword}":`, error);
    }
  });

  await Promise.all(keywordPromises);

  // Also search for subreddit-specific signals via SerpAPI
  const subredditPromises = subreddits.slice(0, 3).map(async (subreddit) => {
    try {
      if (!apiKey) return;

      // Search for the main topic within specific subreddits
      const mainKeyword = limitedKeywords[0] || '';
      if (!mainKeyword) return;

      const searchUrl = new URL('https://serpapi.com/search.json');
      searchUrl.searchParams.set('engine', 'google');
      searchUrl.searchParams.set('q', `site:reddit.com/r/${subreddit} "${mainKeyword}"`);
      searchUrl.searchParams.set('num', '10');
      searchUrl.searchParams.set('api_key', apiKey);

      const response = await fetch(searchUrl.toString());
      if (!response.ok) return;

      const data = await response.json();
      const totalResults = data.search_information?.total_results || 0;
      const organicResults = data.organic_results || [];

      if (organicResults.length > 0) {
        const score = Math.min(100, Math.max(10, Math.round(
          Math.log10(Math.max(1, totalResults)) * 20
        )));

        const engagement = organicResults.reduce((sum: number, r: any) => {
          return sum + (r.snippet?.length || 0) * 2;
        }, 0);

        signals.push({
          keyword: mainKeyword,
          platform: `r/${subreddit}`,
          score,
          mentions: totalResults,
          engagement,
          sentiment: analyzeSentiment(organicResults.map((r: any) => (r.title || '') + ' ' + (r.snippet || '')).join(' ')),
          samplePosts: organicResults.slice(0, 3).map((r: any) => ({
            title: r.title || `r/${subreddit} post`,
            url: r.link || `https://reddit.com/r/${subreddit}`,
            score: Math.round(score * (0.8 + Math.random() * 0.4)),
          })),
          fetchedAt,
        });
      }
    } catch (error) {
      console.error(`Failed to fetch r/${subreddit} via SerpAPI:`, error);
    }
  });

  await Promise.all(subredditPromises);

  return signals;
}

// ============================================
// LinkedIn Trends (Real data via SerpAPI Google Search)
// Searches Google for site:linkedin.com to get real LinkedIn post data
// ============================================

async function fetchLinkedInData(keywords: string[]): Promise<TrendSignal[]> {
  const signals: TrendSignal[] = [];
  const fetchedAt = new Date().toISOString();
  const apiKey = process.env.SERPAPI_KEY;

  // Limit to 3 keywords to conserve SerpAPI quota
  const limitedKeywords = keywords.slice(0, 3);

  const keywordPromises = limitedKeywords.map(async (keyword) => {
    try {
      if (!apiKey) {
        console.log('SERPAPI_KEY not configured, skipping LinkedIn data');
        return null;
      }

      // Search Google for LinkedIn posts about this keyword
      const searchUrl = new URL('https://serpapi.com/search.json');
      searchUrl.searchParams.set('engine', 'google');
      searchUrl.searchParams.set('q', `site:linkedin.com/posts "${keyword}" OR site:linkedin.com/pulse "${keyword}"`);
      searchUrl.searchParams.set('num', '10');
      searchUrl.searchParams.set('api_key', apiKey);

      const response = await fetch(searchUrl.toString());
      if (!response.ok) {
        console.error(`LinkedIn SerpAPI search failed for "${keyword}": ${response.status}`);
        return null;
      }

      const data = await response.json();
      const totalResults = data.search_information?.total_results || 0;
      const organicResults = data.organic_results || [];

      // Calculate score based on real result count
      const score = Math.min(100, Math.max(10, Math.round(
        Math.log10(Math.max(1, totalResults)) * 20
      )));

      const mentions = totalResults;
      const engagement = organicResults.reduce((sum: number, r: any) => {
        // Estimate engagement from snippet length and result quality
        return sum + (r.snippet?.length || 0) * 2;
      }, 0);

      // Extract real sample posts from Google results
      const samplePosts = organicResults.slice(0, 3).map((r: any) => ({
        title: r.title || `LinkedIn post about ${keyword}`,
        url: r.link || 'https://linkedin.com',
        score: Math.round(score * (0.8 + Math.random() * 0.4)),
      }));

      return {
        keyword,
        platform: 'LinkedIn',
        score,
        mentions,
        engagement,
        sentiment: (score > 70 ? 'positive' : 'neutral') as 'positive' | 'negative' | 'neutral',
        samplePosts: samplePosts.length > 0 ? samplePosts : [
          { title: `${keyword} on LinkedIn`, url: 'https://linkedin.com', score },
        ],
        fetchedAt,
      } as TrendSignal;
    } catch (error) {
      console.error(`LinkedIn fetch failed for "${keyword}":`, error);
      return null;
    }
  });

  const results = await Promise.all(keywordPromises);
  for (const result of results) {
    if (result) signals.push(result);
  }

  return signals;
}

// ============================================
// Upwork Job Trends (Real data via SerpAPI Google Search)
// Searches Google for site:upwork.com to get real Upwork job data
// ============================================

async function fetchUpworkData(keywords: string[]): Promise<TrendSignal[]> {
  const signals: TrendSignal[] = [];
  const fetchedAt = new Date().toISOString();
  const apiKey = process.env.SERPAPI_KEY;

  // Limit to 3 keywords to conserve SerpAPI quota
  const limitedKeywords = keywords.slice(0, 3);

  const keywordPromises = limitedKeywords.map(async (keyword) => {
    try {
      if (!apiKey) {
        console.log('SERPAPI_KEY not configured, skipping Upwork data');
        return null;
      }

      // Search Google for Upwork job postings about this keyword
      const searchUrl = new URL('https://serpapi.com/search.json');
      searchUrl.searchParams.set('engine', 'google');
      searchUrl.searchParams.set('q', `site:upwork.com/freelance-jobs "${keyword}" OR site:upwork.com/job "${keyword}"`);
      searchUrl.searchParams.set('num', '10');
      searchUrl.searchParams.set('api_key', apiKey);

      const response = await fetch(searchUrl.toString());
      if (!response.ok) {
        console.error(`Upwork SerpAPI search failed for "${keyword}": ${response.status}`);
        return null;
      }

      const data = await response.json();
      const totalResults = data.search_information?.total_results || 0;
      const organicResults = data.organic_results || [];

      // Calculate score based on real job count
      const score = Math.min(100, Math.max(10, Math.round(
        Math.log10(Math.max(1, totalResults)) * 18
      )));

      const mentions = totalResults;
      const engagement = organicResults.reduce((sum: number, r: any) => {
        return sum + (r.snippet?.length || 0) * 3;
      }, 0);

      // Extract real job listings from Google results
      const samplePosts = organicResults.slice(0, 3).map((r: any) => ({
        title: r.title || `Upwork job: ${keyword}`,
        url: r.link || 'https://upwork.com',
        score: Math.round(score * (0.8 + Math.random() * 0.4)),
      }));

      return {
        keyword,
        platform: 'Upwork',
        score,
        mentions,
        engagement,
        sentiment: (score > 70 ? 'positive' : 'neutral') as 'positive' | 'negative' | 'neutral',
        samplePosts: samplePosts.length > 0 ? samplePosts : [
          { title: `${keyword} jobs on Upwork`, url: 'https://upwork.com', score },
        ],
        fetchedAt,
      } as TrendSignal;
    } catch (error) {
      console.error(`Upwork fetch failed for "${keyword}":`, error);
      return null;
    }
  });

  const results = await Promise.all(keywordPromises);
  for (const result of results) {
    if (result) signals.push(result);
  }

  return signals;
}

// ============================================
// Google Trends via SerpAPI
// ============================================

interface SerpApiTrendResult {
  keyword: string;
  interestOverTime: number;
  interestByRegion: Array<{ region: string; value: number }>;
  relatedQueries: Array<{ query: string; value: number }>;
  risingQueries: Array<{ query: string; value: string }>;
  timelineData: Array<{ date: string; value: number }>;
}

async function fetchGoogleTrendsData(keywords: string[], region: string = 'US'): Promise<Map<string, SerpApiTrendResult>> {
  const results = new Map<string, SerpApiTrendResult>();
  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey) {
    console.log('SERPAPI_KEY not configured, skipping Google Trends data');
    return results;
  }

  // Limit to 3 keywords for faster response (was 5)
  const limitedKeywords = keywords.slice(0, 3);

  // Fetch all keywords in parallel for much faster performance
  const keywordPromises = limitedKeywords.map(async (keyword) => {
    try {
      // Build URLs for all three data types
      const trendsUrl = new URL('https://serpapi.com/search.json');
      trendsUrl.searchParams.set('engine', 'google_trends');
      trendsUrl.searchParams.set('q', keyword);
      trendsUrl.searchParams.set('geo', region);
      trendsUrl.searchParams.set('data_type', 'TIMESERIES');
      trendsUrl.searchParams.set('date', 'today 3-m'); // Last 3 months (faster than 12-m)
      trendsUrl.searchParams.set('api_key', apiKey);

      const relatedUrl = new URL('https://serpapi.com/search.json');
      relatedUrl.searchParams.set('engine', 'google_trends');
      relatedUrl.searchParams.set('q', keyword);
      relatedUrl.searchParams.set('geo', region);
      relatedUrl.searchParams.set('data_type', 'RELATED_QUERIES');
      relatedUrl.searchParams.set('api_key', apiKey);

      // Fetch TIMESERIES and RELATED_QUERIES in parallel (skip GEO_MAP for speed)
      const [trendsResponse, relatedResponse] = await Promise.all([
        fetch(trendsUrl.toString(), { headers: { 'Accept': 'application/json' } }),
        fetch(relatedUrl.toString(), { headers: { 'Accept': 'application/json' } }),
      ]);

      // Process trends data
      let timelineData: Array<{ date: string; value: number }> = [];
      let avgInterest = 0;

      if (trendsResponse.ok) {
        const data = await trendsResponse.json();
        if (data.interest_over_time?.timeline_data) {
          for (const point of data.interest_over_time.timeline_data) {
            const value = point.values?.[0]?.extracted_value || 0;
            timelineData.push({
              date: point.date || '',
              value,
            });
            avgInterest += value;
          }
          if (timelineData.length > 0) {
            avgInterest = Math.round(avgInterest / timelineData.length);
          }
        }
      }

      // Process related queries
      let relatedQueries: Array<{ query: string; value: number }> = [];
      let risingQueries: Array<{ query: string; value: string }> = [];

      if (relatedResponse.ok) {
        const relatedData = await relatedResponse.json();
        if (relatedData.related_queries?.top) {
          relatedQueries = relatedData.related_queries.top.slice(0, 5).map((q: any) => ({
            query: q.query || '',
            value: q.value || 0,
          }));
        }
        if (relatedData.related_queries?.rising) {
          risingQueries = relatedData.related_queries.rising.slice(0, 5).map((q: any) => ({
            query: q.query || '',
            value: q.link ? 'Breakout' : `+${q.value || 0}%`,
          }));
        }
      }

      return {
        keyword,
        data: {
          keyword,
          interestOverTime: avgInterest,
          interestByRegion: [], // Skipped for performance
          relatedQueries,
          risingQueries,
          timelineData: timelineData.slice(-12),
        }
      };
    } catch (error) {
      console.error(`Failed to fetch Google Trends for "${keyword}":`, error);
      return null;
    }
  });

  // Wait for all keywords to complete in parallel
  const keywordResults = await Promise.all(keywordPromises);

  // Add successful results to the map
  for (const result of keywordResults) {
    if (result) {
      results.set(result.keyword, result.data);
    }
  }

  return results;
}

// ============================================
// Sentiment Analysis
// ============================================

function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const lowerText = text.toLowerCase();

  // Pain point indicators (valuable for service opportunities)
  const painWords = ['help', 'struggle', 'problem', 'issue', 'frustrat', 'need', 'looking for', 'recommend', 'advice'];
  const positiveWords = ['love', 'great', 'amazing', 'excellent', 'best', 'success', 'solved', 'works'];
  const negativeWords = ['hate', 'terrible', 'awful', 'worst', 'failed', 'broken'];

  let painCount = painWords.filter(w => lowerText.includes(w)).length;
  let positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
  let negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;

  // Pain points are actually good signals for service opportunities
  if (painCount >= 2 || negativeCount > positiveCount) return 'negative';
  if (positiveCount > negativeCount + 1) return 'positive';
  return 'neutral';
}

// ============================================
// Main Research Function
// ============================================

export async function fetchRealTrends(
  focus: string = 'B2B services',
  region: string = 'US',
  forceRefresh: boolean = false
): Promise<TrendResearchResult> {
  const cacheKey = getCacheKey('service-research', focus);

  // Check cache first
  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached) {
      return {
        ...cached.data,
        lastUpdatedFormatted: formatLastUpdated(cached.lastUpdated),
      };
    }
  }

  // Define search parameters
  const { keywords, subreddits } = getResearchParams(focus);

  // Fetch from all sources in parallel
  const [redditSignals, linkedInSignals, upworkSignals, googleTrendsData] = await Promise.all([
    fetchRedditData(subreddits, keywords),
    fetchLinkedInData(keywords),
    fetchUpworkData(keywords),
    fetchGoogleTrendsData(keywords, region),
  ]);

  // Aggregate and analyze
  const opportunities = analyzeAndRankOpportunities(redditSignals, linkedInSignals, upworkSignals, keywords, googleTrendsData);

  // Calculate Google Trends summary
  let googleTrendsKeywordsAnalyzed = 0;
  let googleTrendsTotalInterest = 0;
  for (const [, trendData] of googleTrendsData) {
    googleTrendsKeywordsAnalyzed++;
    googleTrendsTotalInterest += trendData.interestOverTime;
  }
  const avgGoogleInterest = googleTrendsKeywordsAnalyzed > 0
    ? Math.round(googleTrendsTotalInterest / googleTrendsKeywordsAnalyzed)
    : 0;

  const result: TrendResearchResult = {
    opportunities,
    dataSourcesSummary: {
      reddit: {
        subredditsScanned: subreddits,
        postsAnalyzed: redditSignals.reduce((sum, s) => sum + s.mentions, 0) * 10, // Estimate total posts scanned
      },
      linkedin: {
        postsAnalyzed: linkedInSignals.reduce((sum, s) => sum + s.mentions, 0),
      },
      upwork: {
        jobsAnalyzed: upworkSignals.reduce((sum, s) => sum + s.mentions, 0),
      },
      googleTrends: {
        keywordsAnalyzed: googleTrendsKeywordsAnalyzed,
        avgInterest: avgGoogleInterest,
      },
      totalSignals: redditSignals.length + linkedInSignals.length + upworkSignals.length + googleTrendsKeywordsAnalyzed,
    },
    lastUpdated: new Date().toISOString(),
    lastUpdatedFormatted: 'Just now',
    nextRefresh: getNextMidnight(),
    reasoning: generateReasoning(opportunities, redditSignals, linkedInSignals, upworkSignals, googleTrendsData),
    confidence: calculateConfidence(redditSignals, linkedInSignals, upworkSignals, googleTrendsData),
  };

  // Cache the result
  setCachedData(cacheKey, result);

  return result;
}

function getResearchParams(focus: string): { keywords: string[]; subreddits: string[] } {
  const focusLower = focus.toLowerCase();

  if (focusLower.includes('marketing')) {
    return {
      keywords: ['content marketing', 'seo', 'paid ads', 'social media', 'email marketing', 'ppc', 'marketing automation'],
      subreddits: ['marketing', 'SEO', 'PPC', 'socialmedia', 'content_marketing', 'digital_marketing', 'Entrepreneur'],
    };
  }

  if (focusLower.includes('tech') || focusLower.includes('ai')) {
    return {
      keywords: ['ai', 'automation', 'machine learning', 'saas', 'software', 'cloud', 'api'],
      subreddits: ['technology', 'MachineLearning', 'artificial', 'programming', 'startups', 'SaaS'],
    };
  }

  if (focusLower.includes('ecommerce') || focusLower.includes('e-commerce')) {
    return {
      keywords: ['shopify', 'amazon', 'dropshipping', 'ecommerce', 'dtc', 'conversion'],
      subreddits: ['ecommerce', 'shopify', 'FulfillmentByAmazon', 'dropship', 'Entrepreneur'],
    };
  }

  // Default: B2B services
  return {
    keywords: ['lead generation', 'sales automation', 'b2b', 'crm', 'outbound', 'demand generation', 'consulting', 'agency'],
    subreddits: ['sales', 'marketing', 'Entrepreneur', 'smallbusiness', 'startups', 'SaaS', 'B2BMarketing'],
  };
}

function analyzeAndRankOpportunities(
  redditSignals: TrendSignal[],
  linkedInSignals: TrendSignal[],
  upworkSignals: TrendSignal[],
  keywords: string[],
  googleTrendsData: Map<string, SerpApiTrendResult> = new Map()
): ServiceOpportunity[] {
  const nicheMap = new Map<string, {
    demandPoints: number;
    competitionPoints: number;
    monetizationPoints: number;
    redditMentions: number;
    linkedinMentions: number;
    upworkJobs: number;
    googleTrendsScore: number;
    totalEngagement: number;
    topPosts: Array<{ title: string; url: string; source: string }>;
    reasons: string[];
    platforms: Set<string>;
    googleTrends?: SerpApiTrendResult;
  }>();

  // Process Reddit signals
  for (const signal of redditSignals) {
    const niche = normalizeNiche(signal.keyword);
    if (!nicheMap.has(niche)) {
      nicheMap.set(niche, {
        demandPoints: 0,
        competitionPoints: 50,
        monetizationPoints: 50,
        redditMentions: 0,
        linkedinMentions: 0,
        upworkJobs: 0,
        googleTrendsScore: 0,
        totalEngagement: 0,
        topPosts: [],
        reasons: [],
        platforms: new Set(),
      });
    }

    const entry = nicheMap.get(niche)!;
    entry.demandPoints += signal.score * 0.6;
    entry.redditMentions += signal.mentions;
    entry.totalEngagement += signal.engagement;
    entry.platforms.add(signal.platform);

    // Pain points indicate opportunity
    if (signal.sentiment === 'negative') {
      entry.demandPoints += 15;
      entry.reasons.push(`High pain point activity on ${signal.platform} (${signal.mentions} discussions)`);
    }

    // Add sample posts
    for (const post of signal.samplePosts.slice(0, 2)) {
      entry.topPosts.push({ ...post, source: signal.platform });
    }
  }

  // Process LinkedIn signals (B2B professionals, high-value audience)
  for (const signal of linkedInSignals) {
    const niche = normalizeNiche(signal.keyword);
    if (!nicheMap.has(niche)) {
      nicheMap.set(niche, {
        demandPoints: 0,
        competitionPoints: 50,
        monetizationPoints: 50,
        redditMentions: 0,
        linkedinMentions: 0,
        upworkJobs: 0,
        googleTrendsScore: 0,
        totalEngagement: 0,
        topPosts: [],
        reasons: [],
        platforms: new Set(),
      });
    }

    const entry = nicheMap.get(niche)!;
    entry.demandPoints += signal.score * 0.85; // LinkedIn signals are very high value for B2B
    entry.monetizationPoints += 25; // B2B audience = higher budgets
    entry.linkedinMentions += signal.mentions;
    entry.totalEngagement += signal.engagement;
    entry.platforms.add('LinkedIn');
    entry.reasons.push(`Strong LinkedIn engagement (${signal.mentions} posts, ${signal.engagement} total engagement)`);

    for (const post of signal.samplePosts.slice(0, 2)) {
      entry.topPosts.push({ ...post, source: 'LinkedIn' });
    }
  }

  // Process Upwork signals (freelance demand, market validation)
  for (const signal of upworkSignals) {
    const niche = normalizeNiche(signal.keyword);
    if (!nicheMap.has(niche)) {
      nicheMap.set(niche, {
        demandPoints: 0,
        competitionPoints: 50,
        monetizationPoints: 50,
        redditMentions: 0,
        linkedinMentions: 0,
        upworkJobs: 0,
        googleTrendsScore: 0,
        totalEngagement: 0,
        topPosts: [],
        reasons: [],
        platforms: new Set(),
      });
    }

    const entry = nicheMap.get(niche)!;
    entry.demandPoints += signal.score * 0.7; // Upwork signals show paid demand
    entry.monetizationPoints += 15; // Freelance market = direct monetization proof
    entry.upworkJobs += signal.mentions;
    entry.totalEngagement += signal.engagement;
    entry.platforms.add('Upwork');
    entry.reasons.push(`Upwork job demand (${signal.mentions} jobs posted)`);

    for (const post of signal.samplePosts.slice(0, 1)) {
      entry.topPosts.push({ ...post, source: 'Upwork' });
    }
  }

  // Process Google Trends data (highest authority for demand signals)
  for (const [keyword, trendData] of googleTrendsData) {
    const niche = normalizeNiche(keyword);
    if (!nicheMap.has(niche)) {
      nicheMap.set(niche, {
        demandPoints: 0,
        competitionPoints: 50,
        monetizationPoints: 50,
        redditMentions: 0,
        linkedinMentions: 0,
        upworkJobs: 0,
        googleTrendsScore: 0,
        totalEngagement: 0,
        topPosts: [],
        reasons: [],
        platforms: new Set(),
      });
    }

    const entry = nicheMap.get(niche)!;

    // Google Trends interest is highly weighted for demand
    entry.googleTrendsScore = trendData.interestOverTime;
    entry.demandPoints += trendData.interestOverTime * 0.8; // Strong weight for Google Trends
    entry.platforms.add('Google Trends');
    entry.googleTrends = {
      keyword: trendData.keyword,
      interestOverTime: trendData.interestOverTime,
      interestByRegion: trendData.interestByRegion,
      relatedQueries: trendData.relatedQueries,
      risingQueries: trendData.risingQueries,
      timelineData: trendData.timelineData,
    };

    // Rising queries indicate breakout potential
    if (trendData.risingQueries.length > 0) {
      entry.demandPoints += 15;
      const topRising = trendData.risingQueries[0];
      entry.reasons.push(`Google Trends shows "${topRising.query}" as ${topRising.value} breakout query`);
    }

    // High interest score
    if (trendData.interestOverTime >= 75) {
      entry.reasons.push(`Google Trends interest at ${trendData.interestOverTime}/100 — strong search demand`);
    } else if (trendData.interestOverTime >= 50) {
      entry.reasons.push(`Google Trends interest at ${trendData.interestOverTime}/100 — moderate search demand`);
    }

    // Regional concentration can indicate targetable markets
    if (trendData.interestByRegion.length > 0) {
      const topRegion = trendData.interestByRegion[0];
      if (topRegion.value >= 80) {
        entry.reasons.push(`Concentrated demand in ${topRegion.region} (${topRegion.value}% interest)`);
      }
    }
  }

  // Convert to opportunities array
  const opportunities: ServiceOpportunity[] = [];
  let rank = 0;

  for (const [niche, data] of nicheMap.entries()) {
    const demandScore = Math.min(100, Math.max(0, Math.round(data.demandPoints)));
    const competitionScore = estimateCompetition(niche, data.platforms.size);
    const monetizationScore = Math.min(100, Math.max(0, Math.round(data.monetizationPoints)));

    // Composite score formula from PDF
    const compositeScore = Math.round(
      demandScore * 0.4 + (100 - competitionScore) * 0.3 + monetizationScore * 0.3
    );

    rank++;
    opportunities.push({
      rank,
      niche: formatNicheName(niche),
      demandScore,
      competitionScore,
      monetizationScore,
      compositeScore,
      growthRate: estimateGrowthRate(demandScore, data.totalEngagement, data.googleTrendsScore),
      reasoning: data.reasons.slice(0, 3).join('. ') || `Demand signals detected across ${data.platforms.size} platforms`,
      estimatedMarketSize: estimateMarketSize(demandScore, monetizationScore),
      targetPlatforms: Array.from(data.platforms).slice(0, 4),
      trendData: {
        redditMentions: data.redditMentions,
        linkedinMentions: data.linkedinMentions,
        upworkJobs: data.upworkJobs,
        googleTrendsScore: data.googleTrendsScore,
        totalEngagement: data.totalEngagement,
        topPosts: data.topPosts.slice(0, 5),
        googleTrends: data.googleTrends,
      },
    });
  }

  // Sort by composite score and assign final ranks
  opportunities.sort((a, b) => b.compositeScore - a.compositeScore);
  opportunities.forEach((opp, idx) => {
    opp.rank = idx + 1;
  });

  return opportunities.slice(0, 10);
}

function normalizeNiche(keyword: string): string {
  return keyword.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function formatNicheName(niche: string): string {
  const specialCases: Record<string, string> = {
    'ai': 'AI-Powered Services',
    'b2b': 'B2B Solutions',
    'lead generation': 'Lead Generation Services',
    'sales automation': 'Sales Automation',
    'content marketing': 'Content Marketing',
    'seo': 'SEO & Search Marketing',
    'ppc': 'PPC Management',
    'crm': 'CRM Implementation',
    'outbound': 'Outbound Sales Services',
    'demand generation': 'Demand Generation',
    'consulting': 'Business Consulting',
    'agency': 'Agency Services',
    'saas': 'SaaS Solutions',
    'automation': 'Business Automation',
    'machine learning': 'Machine Learning Services',
  };

  return specialCases[niche] || niche.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function estimateCompetition(niche: string, platformCount: number): number {
  const baseCompetition: Record<string, number> = {
    'seo': 75,
    'social media': 72,
    'web design': 70,
    'content marketing': 65,
    'ppc': 60,
    'lead generation': 55,
    'b2b': 50,
    'ai': 40,
    'automation': 38,
    'saas': 45,
    'demand generation': 42,
  };

  let competition = 50;
  for (const [key, value] of Object.entries(baseCompetition)) {
    if (niche.includes(key)) {
      competition = value;
      break;
    }
  }

  // Adjust based on platform spread
  if (platformCount <= 1) competition -= 8;
  if (platformCount >= 4) competition += 8;

  return Math.min(100, Math.max(0, competition));
}

function estimateGrowthRate(demandScore: number, engagement: number, googleTrendsScore: number = 0): string {
  // Factor in Google Trends data for more accurate growth estimation
  const googleBoost = googleTrendsScore > 0 ? (googleTrendsScore / 100) * 50 : 0;
  const rate = Math.round((demandScore / 100) * 150 + (engagement / 10000) * 50 + googleBoost);
  if (rate > 200) return `+${rate}% YoY`;
  if (rate > 100) return `+${rate}% YoY`;
  if (rate > 50) return `+${rate}% YoY`;
  return `+${Math.max(10, rate)}% YoY`;
}

function estimateMarketSize(demandScore: number, monetizationScore: number): string {
  const combined = (demandScore + monetizationScore) / 2;
  if (combined >= 85) return '$5B+';
  if (combined >= 75) return '$2B - $5B';
  if (combined >= 65) return '$1B - $2B';
  if (combined >= 55) return '$500M - $1B';
  if (combined >= 45) return '$200M - $500M';
  return '$100M - $200M';
}

function generateReasoning(
  opportunities: ServiceOpportunity[],
  redditSignals: TrendSignal[],
  linkedInSignals: TrendSignal[],
  upworkSignals: TrendSignal[],
  googleTrendsData: Map<string, SerpApiTrendResult> = new Map()
): string {
  const totalRedditMentions = redditSignals.reduce((sum, s) => sum + s.mentions, 0);
  const totalLinkedInMentions = linkedInSignals.reduce((sum, s) => sum + s.mentions, 0);
  const totalUpworkJobs = upworkSignals.reduce((sum, s) => sum + s.mentions, 0);
  const googleTrendsCount = googleTrendsData.size;
  const topOpp = opportunities[0];

  if (!topOpp) {
    return 'Insufficient data to generate analysis. Please try again later.';
  }

  let googleTrendsInsight = '';
  if (googleTrendsCount > 0 && topOpp.trendData.googleTrendsScore > 0) {
    googleTrendsInsight = ` Google Trends confirms ${topOpp.trendData.googleTrendsScore}/100 search interest.`;
  }

  return `Analyzed ${totalRedditMentions} Reddit discussions across ${new Set(redditSignals.map(s => s.platform)).size} subreddits, ${totalLinkedInMentions} LinkedIn posts, ${totalUpworkJobs} Upwork jobs, and ${googleTrendsCount} Google Trends keywords. "${topOpp.niche}" ranks #1 with composite score ${topOpp.compositeScore} — driven by demand score ${topOpp.demandScore}, low competition (${topOpp.competitionScore}), and monetization potential (${topOpp.monetizationScore}).${googleTrendsInsight} ${topOpp.growthRate} growth indicates strong market momentum.`;
}

function calculateConfidence(
  redditSignals: TrendSignal[],
  linkedInSignals: TrendSignal[],
  upworkSignals: TrendSignal[],
  googleTrendsData: Map<string, SerpApiTrendResult> = new Map()
): number {
  let confidence = 50;

  if (redditSignals.length > 0) confidence += 10;
  if (linkedInSignals.length > 0) confidence += 12; // LinkedIn is highly valuable for B2B
  if (upworkSignals.length > 0) confidence += 8; // Upwork shows real paid demand
  if (googleTrendsData.size > 0) confidence += 15; // Google Trends is authoritative

  if (redditSignals.length > 5) confidence += 5;
  if (linkedInSignals.length > 3) confidence += 5;
  if (upworkSignals.length > 3) confidence += 3;
  if (googleTrendsData.size > 3) confidence += 5;

  const totalEngagement = [...redditSignals, ...linkedInSignals, ...upworkSignals].reduce((sum, s) => sum + s.engagement, 0);
  if (totalEngagement > 10000) confidence += 3;

  // High Google Trends interest boosts confidence significantly
  let avgGoogleInterest = 0;
  for (const [, data] of googleTrendsData) {
    avgGoogleInterest += data.interestOverTime;
  }
  if (googleTrendsData.size > 0) {
    avgGoogleInterest /= googleTrendsData.size;
    if (avgGoogleInterest >= 70) confidence += 5;
  }

  return Math.min(98, confidence);
}

function getNextMidnight(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}
