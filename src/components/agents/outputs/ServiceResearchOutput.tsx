'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Target,
  DollarSign,
  Users,
  ExternalLink,
  RefreshCw,
  Clock,
  Award,
  BarChart3,
  Flame,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ServiceOpportunity {
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

interface TrendResearchResult {
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

interface Props {
  data?: TrendResearchResult | { data: TrendResearchResult } | any;
  isLive?: boolean;
}

export function ServiceResearchOutput({ data, isLive = false }: Props) {
  const [liveData, setLiveData] = useState<TrendResearchResult | null>(null);
  const [loading, setLoading] = useState(isLive);
  const [error, setError] = useState<string | null>(null);
  const [expandedOpportunity, setExpandedOpportunity] = useState<number | null>(0);

  useEffect(() => {
    if (isLive) {
      fetchLiveData();
    }
  }, [isLive]);

  const fetchLiveData = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trends?focus=B2B%20services&refresh=${forceRefresh}`);
      const result = await res.json();
      if (result.success) {
        setLiveData(result);
      } else {
        setError(result.error || 'Failed to fetch trends');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  // Handle nested data structure (data might come from API as { data: {...} } or directly)
  const rawData = liveData || data;
  const displayData = rawData?.data || rawData;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm text-muted-foreground">Fetching live trends from Reddit & Hacker News...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => fetchLiveData(true)}
          className="mt-2 text-xs text-blue-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!displayData || !displayData.opportunities?.length) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No opportunities found. Click refresh to fetch latest trends.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Last Updated */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold">Service Opportunities</h3>
          <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
            LIVE DATA
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated {displayData.lastUpdatedFormatted}</span>
          </div>
          {isLive && (
            <button
              onClick={() => fetchLiveData(true)}
              className="p-1.5 hover:bg-accent rounded-md transition-colors"
              title="Refresh trends"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Data Sources Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <div className="p-2 sm:p-3 bg-orange-500/10 rounded-lg border border-orange-500/20 flex sm:block items-center justify-between">
          <div className="text-xs text-muted-foreground sm:hidden">Reddit Posts</div>
          <div className="text-lg sm:text-2xl font-bold text-orange-400">
            {displayData.dataSourcesSummary.reddit.postsAnalyzed.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">Reddit Posts Analyzed</div>
        </div>
        <div className="p-2 sm:p-3 bg-purple-500/10 rounded-lg border border-purple-500/20 flex sm:block items-center justify-between">
          <div className="text-xs text-muted-foreground sm:hidden">HN Stories</div>
          <div className="text-lg sm:text-2xl font-bold text-purple-400">
            {displayData.dataSourcesSummary.hackerNews.storiesAnalyzed}
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">HN Stories Scanned</div>
        </div>
        <div className="p-2 sm:p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 flex sm:block items-center justify-between">
          <div className="text-xs text-muted-foreground sm:hidden">Confidence</div>
          <div className="text-lg sm:text-2xl font-bold text-blue-400">
            {displayData.confidence}%
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">Confidence Score</div>
        </div>
      </div>

      {/* Ranked Opportunities List */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Award className="w-4 h-4 text-yellow-500" />
          Ranked Service Opportunities
        </h4>

        {displayData.opportunities.map((opp, idx) => (
          <div
            key={idx}
            className={`rounded-lg border transition-all ${
              expandedOpportunity === idx
                ? 'border-blue-500/50 bg-blue-500/5'
                : 'border-border hover:border-border/80'
            }`}
          >
            {/* Opportunity Header */}
            <button
              onClick={() => setExpandedOpportunity(expandedOpportunity === idx ? null : idx)}
              className="w-full p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between text-left gap-2 sm:gap-0"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 ${
                  opp.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                  opp.rank === 2 ? 'bg-slate-400/20 text-slate-300' :
                  opp.rank === 3 ? 'bg-amber-600/20 text-amber-500' :
                  'bg-muted text-muted-foreground'
                }`}>
                  #{opp.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm sm:text-base truncate">{opp.niche}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                    <span>Score: <span className="text-green-400 font-semibold">{opp.compositeScore}</span></span>
                    <span className="hidden xs:inline">•</span>
                    <span>Size: <span className="text-blue-400">{opp.estimatedMarketSize}</span></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-9 sm:pl-0">
                <div className="flex items-center gap-1 text-green-400 text-xs sm:text-sm">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {opp.growthRate}
                </div>
                {expandedOpportunity === idx ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            </button>

            {/* Expanded Details */}
            {expandedOpportunity === idx && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 sm:space-y-4 border-t border-border/50">
                {/* Score Bars */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 sm:pt-4">
                  <ScoreBar label="Demand" score={opp.demandScore} color="blue" icon={<Users className="w-3.5 h-3.5" />} />
                  <ScoreBar label="Competition" score={100 - opp.competitionScore} color="green" icon={<Target className="w-3.5 h-3.5" />} inverted />
                  <ScoreBar label="Monetization" score={opp.monetizationScore} color="purple" icon={<DollarSign className="w-3.5 h-3.5" />} />
                </div>

                {/* Reasoning */}
                <div className="p-2.5 sm:p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Analysis</div>
                  <p className="text-xs sm:text-sm leading-relaxed">{opp.reasoning}</p>
                </div>

                {/* Trend Data */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="p-2.5 sm:p-3 bg-orange-500/5 rounded-lg border border-orange-500/10">
                    <div className="text-base sm:text-lg font-bold text-orange-400">{opp.trendData.redditMentions}</div>
                    <div className="text-xs text-muted-foreground">Reddit Mentions</div>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-purple-500/5 rounded-lg border border-purple-500/10">
                    <div className="text-base sm:text-lg font-bold text-purple-400">{opp.trendData.hnMentions}</div>
                    <div className="text-xs text-muted-foreground">HN Mentions</div>
                  </div>
                </div>

                {/* Target Platforms */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5 sm:mb-2">Target Platforms</div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {opp.targetPlatforms.map((platform, pIdx) => (
                      <span key={pIdx} className="px-2 py-0.5 sm:py-1 text-xs bg-muted rounded-md">
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Top Posts */}
                {opp.trendData.topPosts.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1.5 sm:mb-2">Trending Discussions</div>
                    <div className="space-y-1.5 sm:space-y-2">
                      {opp.trendData.topPosts.slice(0, 3).map((post, pIdx) => (
                        <a
                          key={pIdx}
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2 p-2 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors group"
                        >
                          <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                            post.source.includes('r/') ? 'bg-orange-500/20 text-orange-400' : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {post.source}
                          </span>
                          <span className="text-xs sm:text-sm flex-1 line-clamp-2 sm:line-clamp-1">{post.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hidden sm:block" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Overall Reasoning */}
      <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium">Research Summary</span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{displayData.reasoning}</p>
      </div>
    </div>
  );
}

function ScoreBar({
  label,
  score,
  color,
  icon,
  inverted = false
}: {
  label: string;
  score: number;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  icon: React.ReactNode;
  inverted?: boolean;
}) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  };

  return (
    <div className="p-2.5 sm:p-3 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="flex items-center gap-1 text-muted-foreground">
          {icon}
          <span className="hidden xs:inline">{label}</span>
          <span className="xs:hidden">{label.slice(0, 3)}</span>
        </span>
        <span className={`font-semibold ${score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
          {inverted ? `${100 - score}%` : `${score}`}
        </span>
      </div>
      <div className="h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClasses[color]}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground mt-1 hidden sm:block">
        {inverted ? 'saturated' : 'out of 100'}
      </div>
    </div>
  );
}

export default ServiceResearchOutput;
