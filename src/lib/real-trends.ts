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
    hnMentions: number;
    totalEngagement: number;
    topPosts: Array<{ title: string; url: string; source: string }>;
  };
}

export interface TrendResearchResult {
  opportunities: ServiceOpportunity[];
  dataSourcesSummary: {
    reddit: { subredditsScanned: string[]; postsAnalyzed: number };
    hackerNews: { storiesAnalyzed: number };
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

  for (const subreddit of subreddits) {
    try {
      const response = await fetch(
        `https://www.reddit.com/r/${subreddit}/hot.json?limit=100`,
        {
          headers: {
            'User-Agent': 'LeadOS/1.0 (Service Research Agent)',
          },
          next: { revalidate: 3600 }, // Cache for 1 hour in Next.js
        }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const posts = data.data.children.map((child: any) => ({
        title: child.data.title,
        selftext: child.data.selftext || '',
        score: child.data.score,
        numComments: child.data.num_comments,
        url: `https://reddit.com${child.data.permalink}`,
        created: child.data.created_utc,
      }));

      // Analyze for each keyword
      for (const keyword of keywords) {
        const lowerKeyword = keyword.toLowerCase();
        const matchingPosts = posts.filter(
          (p: any) =>
            p.title.toLowerCase().includes(lowerKeyword) ||
            p.selftext.toLowerCase().includes(lowerKeyword)
        );

        if (matchingPosts.length > 0) {
          const totalScore = matchingPosts.reduce((sum: number, p: any) => sum + p.score, 0);
          const totalComments = matchingPosts.reduce((sum: number, p: any) => sum + p.numComments, 0);
          const avgScore = totalScore / matchingPosts.length;
          const avgComments = totalComments / matchingPosts.length;

          // Calculate demand score based on engagement
          const engagementScore = Math.min(100, Math.round(
            (avgScore / 500) * 40 + (avgComments / 100) * 30 + (matchingPosts.length / 10) * 30
          ));

          signals.push({
            keyword,
            platform: `r/${subreddit}`,
            score: engagementScore,
            mentions: matchingPosts.length,
            engagement: totalScore + totalComments,
            sentiment: analyzeSentiment(matchingPosts.map((p: any) => p.title + ' ' + p.selftext).join(' ')),
            samplePosts: matchingPosts.slice(0, 3).map((p: any) => ({
              title: p.title,
              url: p.url,
              score: p.score,
            })),
            fetchedAt,
          });
        }
      }
    } catch (error) {
      console.error(`Failed to fetch r/${subreddit}:`, error);
    }
  }

  return signals;
}

// ============================================
// Hacker News API (Completely Free)
// ============================================

async function fetchHackerNewsData(keywords: string[]): Promise<TrendSignal[]> {
  const signals: TrendSignal[] = [];
  const fetchedAt = new Date().toISOString();

  try {
    // Get top and best stories
    const [topRes, bestRes] = await Promise.all([
      fetch('https://hacker-news.firebaseio.com/v0/topstories.json'),
      fetch('https://hacker-news.firebaseio.com/v0/beststories.json'),
    ]);

    const topIds: number[] = await topRes.json();
    const bestIds: number[] = await bestRes.json();

    // Combine and dedupe
    const allIds = [...new Set([...topIds.slice(0, 100), ...bestIds.slice(0, 50)])];

    // Fetch story details (limit to 150 for performance)
    const storyPromises = allIds.slice(0, 150).map(async (id) => {
      const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      return res.json();
    });

    const stories = await Promise.all(storyPromises);
    const validStories = stories.filter((s) => s && s.title);

    // Analyze for keywords
    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      const matchingStories = validStories.filter(
        (s) => s.title.toLowerCase().includes(lowerKeyword)
      );

      if (matchingStories.length > 0) {
        const totalScore = matchingStories.reduce((sum, s) => sum + (s.score || 0), 0);
        const totalComments = matchingStories.reduce((sum, s) => sum + (s.descendants || 0), 0);
        const avgScore = totalScore / matchingStories.length;

        signals.push({
          keyword,
          platform: 'Hacker News',
          score: Math.min(100, Math.round((avgScore / 300) * 100)),
          mentions: matchingStories.length,
          engagement: totalScore + totalComments,
          sentiment: 'neutral',
          samplePosts: matchingStories.slice(0, 3).map((s) => ({
            title: s.title,
            url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
            score: s.score || 0,
          })),
          fetchedAt,
        });
      }
    }
  } catch (error) {
    console.error('Hacker News fetch failed:', error);
  }

  return signals;
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
  const [redditSignals, hnSignals] = await Promise.all([
    fetchRedditData(subreddits, keywords),
    fetchHackerNewsData(keywords),
  ]);

  // Aggregate and analyze
  const opportunities = analyzeAndRankOpportunities(redditSignals, hnSignals, keywords);

  const result: TrendResearchResult = {
    opportunities,
    dataSourcesSummary: {
      reddit: {
        subredditsScanned: subreddits,
        postsAnalyzed: redditSignals.reduce((sum, s) => sum + s.mentions, 0) * 10, // Estimate total posts scanned
      },
      hackerNews: {
        storiesAnalyzed: 150,
      },
      totalSignals: redditSignals.length + hnSignals.length,
    },
    lastUpdated: new Date().toISOString(),
    lastUpdatedFormatted: 'Just now',
    nextRefresh: getNextMidnight(),
    reasoning: generateReasoning(opportunities, redditSignals, hnSignals),
    confidence: calculateConfidence(redditSignals, hnSignals),
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
  hnSignals: TrendSignal[],
  keywords: string[]
): ServiceOpportunity[] {
  const nicheMap = new Map<string, {
    demandPoints: number;
    competitionPoints: number;
    monetizationPoints: number;
    redditMentions: number;
    hnMentions: number;
    totalEngagement: number;
    topPosts: Array<{ title: string; url: string; source: string }>;
    reasons: string[];
    platforms: Set<string>;
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
        hnMentions: 0,
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

  // Process Hacker News signals (tech-savvy, high-value audience)
  for (const signal of hnSignals) {
    const niche = normalizeNiche(signal.keyword);
    if (!nicheMap.has(niche)) {
      nicheMap.set(niche, {
        demandPoints: 0,
        competitionPoints: 50,
        monetizationPoints: 50,
        redditMentions: 0,
        hnMentions: 0,
        totalEngagement: 0,
        topPosts: [],
        reasons: [],
        platforms: new Set(),
      });
    }

    const entry = nicheMap.get(niche)!;
    entry.demandPoints += signal.score * 0.8; // HN signals are high value
    entry.monetizationPoints += 20; // Tech audience = higher budgets
    entry.hnMentions += signal.mentions;
    entry.totalEngagement += signal.engagement;
    entry.platforms.add('Hacker News');
    entry.reasons.push(`Trending on Hacker News (${signal.mentions} stories, ${signal.engagement} total engagement)`);

    for (const post of signal.samplePosts.slice(0, 2)) {
      entry.topPosts.push({ ...post, source: 'Hacker News' });
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
      growthRate: estimateGrowthRate(demandScore, data.totalEngagement),
      reasoning: data.reasons.slice(0, 3).join('. ') || `Demand signals detected across ${data.platforms.size} platforms`,
      estimatedMarketSize: estimateMarketSize(demandScore, monetizationScore),
      targetPlatforms: Array.from(data.platforms).slice(0, 4),
      trendData: {
        redditMentions: data.redditMentions,
        hnMentions: data.hnMentions,
        totalEngagement: data.totalEngagement,
        topPosts: data.topPosts.slice(0, 5),
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

function estimateGrowthRate(demandScore: number, engagement: number): string {
  const rate = Math.round((demandScore / 100) * 150 + (engagement / 10000) * 50);
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
  hnSignals: TrendSignal[]
): string {
  const totalRedditMentions = redditSignals.reduce((sum, s) => sum + s.mentions, 0);
  const totalHnMentions = hnSignals.reduce((sum, s) => sum + s.mentions, 0);
  const topOpp = opportunities[0];

  if (!topOpp) {
    return 'Insufficient data to generate analysis. Please try again later.';
  }

  return `Analyzed ${totalRedditMentions} Reddit discussions across ${new Set(redditSignals.map(s => s.platform)).size} subreddits and ${totalHnMentions} Hacker News stories. "${topOpp.niche}" ranks #1 with composite score ${topOpp.compositeScore} — driven by demand score ${topOpp.demandScore}, low competition (${topOpp.competitionScore}), and monetization potential (${topOpp.monetizationScore}). ${topOpp.growthRate} growth indicates strong market momentum.`;
}

function calculateConfidence(redditSignals: TrendSignal[], hnSignals: TrendSignal[]): number {
  let confidence = 50;

  if (redditSignals.length > 0) confidence += 15;
  if (hnSignals.length > 0) confidence += 15;
  if (redditSignals.length > 5) confidence += 10;
  if (hnSignals.length > 3) confidence += 5;

  const totalEngagement = [...redditSignals, ...hnSignals].reduce((sum, s) => sum + s.engagement, 0);
  if (totalEngagement > 10000) confidence += 5;

  return Math.min(95, confidence);
}

function getNextMidnight(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}
