'use client';

import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign,
  Scale,
  Shield,
  ArrowRight
} from 'lucide-react';

interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

interface ValidationData {
  decision: 'GO' | 'NO-GO' | 'CONDITIONAL';
  scores: {
    marketDemand: number;
    competitiveSaturation: number;
    pricingFeasibility: number;
    cacVsLtv: number;
  };
  cacEstimate: number;
  ltvEstimate: number;
  ltvCacRatio: number;
  riskScore: number;
  riskFactors: RiskFactor[];
  reasoning: string;
  confidence: number;
}

interface Props {
  data: ValidationData | { data: ValidationData } | any;
}

export function ValidationOutput({ data }: Props) {
  // Handle nested data structure from API (data might be wrapped in { data: {...} })
  const validationData: ValidationData = data?.data || data;

  if (!validationData || !validationData.scores) {
    return <div className="p-4 text-muted-foreground">No validation data available</div>;
  }

  const getDecisionConfig = (decision: string) => {
    switch (decision) {
      case 'GO':
        return {
          icon: <CheckCircle2 className="w-8 h-8" />,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          label: 'PROCEED TO BUILD'
        };
      case 'NO-GO':
        return {
          icon: <XCircle className="w-8 h-8" />,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          label: 'DO NOT PROCEED'
        };
      default:
        return {
          icon: <AlertTriangle className="w-8 h-8" />,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          label: 'CONDITIONAL APPROVAL'
        };
    }
  };

  const decisionConfig = getDecisionConfig(validationData.decision);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Decision Banner */}
      <div className={`p-4 sm:p-6 rounded-xl border-2 ${decisionConfig.bgColor} ${decisionConfig.borderColor}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`${decisionConfig.color} shrink-0`}>
              <div className="w-6 h-6 sm:w-8 sm:h-8">{decisionConfig.icon}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5 sm:mb-1">Decision</div>
              <div className={`text-xl sm:text-2xl font-bold ${decisionConfig.color}`}>{validationData.decision}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">{decisionConfig.label}</div>
            </div>
          </div>
          <div className="text-left sm:text-right pl-9 sm:pl-0">
            <div className="text-xs text-muted-foreground mb-0.5 sm:mb-1">Confidence</div>
            <div className="text-2xl sm:text-3xl font-bold">{validationData.confidence || data?.confidence || 0}%</div>
          </div>
        </div>
      </div>

      {/* Score Cards Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <ScoreCard
          label="Market Demand"
          score={validationData.scores.marketDemand}
          icon={<TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          description="Buyer intent"
        />
        <ScoreCard
          label="Competition"
          score={100 - validationData.scores.competitiveSaturation}
          icon={<Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          description={`${validationData.scores.competitiveSaturation}% saturated`}
          inverted
        />
        <ScoreCard
          label="Pricing"
          score={validationData.scores.pricingFeasibility}
          icon={<DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          description="Willingness to pay"
        />
        <ScoreCard
          label="CAC vs LTV"
          score={validationData.scores.cacVsLtv}
          icon={<Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          description={`${validationData.ltvCacRatio?.toFixed(1) || '0'}x ratio`}
        />
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="p-2.5 sm:p-4 bg-muted/30 rounded-lg text-center border border-border/50">
          <div className="text-xs text-muted-foreground mb-0.5 sm:mb-1">Est. CAC</div>
          <div className="text-base sm:text-xl font-bold text-orange-400">${validationData.cacEstimate?.toFixed(0) || '0'}</div>
          <div className="text-xs text-muted-foreground hidden sm:block">per customer</div>
        </div>
        <div className="p-2.5 sm:p-4 bg-muted/30 rounded-lg text-center border border-border/50">
          <div className="text-xs text-muted-foreground mb-0.5 sm:mb-1">Est. LTV</div>
          <div className="text-base sm:text-xl font-bold text-green-400">${validationData.ltvEstimate?.toLocaleString() || '0'}</div>
          <div className="text-xs text-muted-foreground hidden sm:block">lifetime value</div>
        </div>
        <div className="p-2.5 sm:p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg text-center border border-green-500/20">
          <div className="text-xs text-muted-foreground mb-0.5 sm:mb-1">LTV/CAC</div>
          <div className={`text-base sm:text-xl font-bold ${(validationData.ltvCacRatio || 0) >= 3 ? 'text-green-400' : 'text-yellow-400'}`}>
            {validationData.ltvCacRatio?.toFixed(1) || '0'}x
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">
            {(validationData.ltvCacRatio || 0) >= 3 ? '✓ Above 3x' : '⚠ Below 3x'}
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-3 sm:p-4 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 shrink-0" />
            <span className="font-medium text-sm sm:text-base">Risk Assessment</span>
          </div>
          <div className="flex items-center gap-2 pl-6 sm:pl-0">
            <span className="text-xs sm:text-sm text-muted-foreground">Risk:</span>
            <span className={`font-bold text-sm sm:text-base ${
              (validationData.riskScore || 0) <= 30 ? 'text-green-400' :
              (validationData.riskScore || 0) <= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {validationData.riskScore || 0}/100
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
          {(validationData.riskFactors || []).map((risk, idx) => (
            <RiskFactorCard key={idx} risk={risk} />
          ))}
        </div>
      </div>

      {/* Reasoning */}
      <div className="p-3 sm:p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
        <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium text-blue-400">Validation Reasoning</span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">{validationData.reasoning || data?.reasoning || ''}</p>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  score,
  icon,
  description,
  inverted = false
}: {
  label: string;
  score: number;
  icon: React.ReactNode;
  description: string;
  inverted?: boolean;
}) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-400';
    if (s >= 60) return 'text-blue-400';
    if (s >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const displayScore = inverted ? 100 - score : score;

  return (
    <div className="p-2.5 sm:p-4 bg-muted/20 rounded-lg border border-border">
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
        <span className="text-muted-foreground shrink-0">{icon}</span>
        <span className="text-xs text-muted-foreground truncate">{label}</span>
      </div>
      <div className={`text-xl sm:text-2xl font-bold ${getScoreColor(score)}`}>{displayScore}</div>
      <div className="text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">{description}</div>
      <div className="mt-1.5 sm:mt-2 h-1 sm:h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            score >= 80 ? 'bg-green-500' :
            score >= 60 ? 'bg-blue-500' :
            score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function RiskFactorCard({ risk }: { risk: RiskFactor }) {
  const severityConfig = {
    low: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    high: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  };

  const config = severityConfig[risk.severity];

  return (
    <div className={`p-2.5 sm:p-3 rounded-lg ${config.bg} border ${config.border}`}>
      <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
        <p className="text-xs sm:text-sm font-medium leading-snug break-words">{risk.factor}</p>
        <span className={`px-1.5 sm:px-2 py-0.5 text-xs rounded-full shrink-0 ${config.bg} ${config.color} border ${config.border}`}>
          {risk.severity.toUpperCase()}
        </span>
      </div>
      <div className="text-xs text-muted-foreground leading-relaxed break-words">
        <span className="text-green-400 font-medium">Mitigation: </span>
        {risk.mitigation}
      </div>
    </div>
  );
}

export default ValidationOutput;
