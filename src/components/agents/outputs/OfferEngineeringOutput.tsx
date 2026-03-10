'use client';

import React, { useState } from 'react';
import {
  Package,
  Users,
  Target,
  DollarSign,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

interface PricingTier {
  name: string;
  price: number;
  billingCycle: string;
  features: string[];
}

interface OfferData {
  offer: {
    serviceName: string;
    icp: {
      description: string;
      companySize: string;
      revenue: string;
      industry: string;
      decisionMaker: string;
      psychographics?: string;
    };
    painPoints: string[];
    transformationPromise: string;
    pricingTiers: PricingTier[];
    guarantee: string;
    positioning: string;
    uniqueMechanism: string;
  };
  reasoning: string;
  confidence: number;
}

interface Props {
  data: OfferData | { data: OfferData } | any;
}

export function OfferEngineeringOutput({ data }: Props) {
  const [expandedSection, setExpandedSection] = useState<string | null>('pricing');

  // Handle nested data structure from API (data might be wrapped in { data: {...} })
  const offerData: OfferData = data?.data || data;

  if (!offerData?.offer) {
    return <div className="p-4 text-muted-foreground">No offer data available</div>;
  }

  const { offer } = offerData;
  const confidence = offerData.confidence || data?.confidence || 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Service Name Header */}
      <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 shrink-0" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Service Offer</span>
        </div>
        <h2 className="text-base sm:text-xl font-bold leading-tight">{offer.serviceName}</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed break-words">{offer.transformationPromise}</p>
      </div>

      {/* ICP Section */}
      <CollapsibleSection
        title="Ideal Customer Profile"
        icon={<Users className="w-4 h-4" />}
        expanded={expandedSection === 'icp'}
        onToggle={() => setExpandedSection(expandedSection === 'icp' ? null : 'icp')}
      >
        <div className="space-y-3 sm:space-y-4">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">{offer.icp.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <InfoCard label="Company Size" value={offer.icp.companySize} />
            <InfoCard label="Revenue Range" value={offer.icp.revenue} />
            <InfoCard label="Industry" value={offer.icp.industry} />
            <InfoCard label="Decision Maker" value={offer.icp.decisionMaker} />
          </div>

          {offer.icp.psychographics && (
            <div className="p-2.5 sm:p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <span className="text-xs text-purple-400 font-medium">Psychographics</span>
              <p className="text-xs sm:text-sm mt-1 leading-relaxed break-words">{offer.icp.psychographics}</p>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Pain Points */}
      <CollapsibleSection
        title="Pain Points"
        icon={<AlertTriangle className="w-4 h-4" />}
        expanded={expandedSection === 'pain'}
        onToggle={() => setExpandedSection(expandedSection === 'pain' ? null : 'pain')}
        badge={`${offer.painPoints.length}`}
      >
        <div className="space-y-2">
          {offer.painPoints.map((point, idx) => (
            <div key={idx} className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-red-500/5 rounded-lg border border-red-500/10">
              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-500/20 flex items-center justify-center text-xs text-red-400 shrink-0">
                {idx + 1}
              </span>
              <p className="text-xs sm:text-sm leading-relaxed break-words">{point}</p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Pricing Tiers */}
      <CollapsibleSection
        title="Pricing"
        icon={<DollarSign className="w-4 h-4" />}
        expanded={expandedSection === 'pricing'}
        onToggle={() => setExpandedSection(expandedSection === 'pricing' ? null : 'pricing')}
      >
        <div className="space-y-3">
          {offer.pricingTiers.map((tier, idx) => (
            <PricingCard key={idx} tier={tier} isPopular={idx === 1} />
          ))}
        </div>
      </CollapsibleSection>

      {/* Guarantee */}
      <CollapsibleSection
        title="Guarantee"
        icon={<Shield className="w-4 h-4" />}
        expanded={expandedSection === 'guarantee'}
        onToggle={() => setExpandedSection(expandedSection === 'guarantee' ? null : 'guarantee')}
      >
        <div className="p-3 sm:p-4 bg-green-500/10 rounded-lg border border-green-500/20">
          <div className="flex items-start gap-2 sm:gap-3">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm leading-relaxed break-words">{offer.guarantee}</p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Positioning & Unique Mechanism */}
      <CollapsibleSection
        title="Positioning"
        icon={<Target className="w-4 h-4" />}
        expanded={expandedSection === 'position'}
        onToggle={() => setExpandedSection(expandedSection === 'position' ? null : 'position')}
      >
        <div className="space-y-3 sm:space-y-4">
          <div className="p-2.5 sm:p-3 bg-muted/50 rounded-lg">
            <div className="text-xs font-medium text-muted-foreground mb-1">Market Positioning</div>
            <p className="text-xs sm:text-sm leading-relaxed break-words">{offer.positioning}</p>
          </div>

          <div className="p-2.5 sm:p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 shrink-0" />
              <span className="text-xs font-medium text-purple-400">Unique Mechanism</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed break-words">{offer.uniqueMechanism}</p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Confidence Score */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="text-xs sm:text-sm">Confidence Score</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex-1 sm:w-24 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-green-400 shrink-0">{confidence}%</span>
        </div>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  children,
  badge
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 sm:p-4 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 text-muted-foreground">{icon}</span>
          <span className="font-medium text-sm sm:text-base truncate">{title}</span>
          {badge && (
            <span className="px-1.5 sm:px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full shrink-0">
              {badge}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 shrink-0 ml-2" />}
      </button>
      {expanded && <div className="p-3 sm:p-4 border-t border-border">{children}</div>}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 sm:p-3 bg-muted/30 rounded-lg border border-border/50">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xs sm:text-sm font-medium mt-0.5 leading-snug break-words">{value}</div>
    </div>
  );
}

function PricingCard({ tier, isPopular }: { tier: PricingTier; isPopular: boolean }) {
  return (
    <div className={`relative p-3 rounded-lg border ${
      isPopular ? 'border-blue-500/50 bg-blue-500/5' : 'border-border bg-muted/20'
    }`}>
      {isPopular && (
        <span className="absolute -top-2 left-3 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
          Popular
        </span>
      )}
      <div className="flex items-center justify-between mb-2 pt-1">
        <h4 className="font-semibold text-sm">{tier.name}</h4>
        <div>
          <span className="text-lg font-bold">${tier.price.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">/{tier.billingCycle}</span>
        </div>
      </div>
      <ul className="space-y-1">
        {tier.features.slice(0, 4).map((feature, idx) => (
          <li key={idx} className="flex items-start gap-1.5 text-xs">
            <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
            <span className="text-muted-foreground leading-tight line-clamp-1">{feature}</span>
          </li>
        ))}
        {tier.features.length > 4 && (
          <li className="text-xs text-muted-foreground pl-4">
            +{tier.features.length - 4} more features
          </li>
        )}
      </ul>
    </div>
  );
}

export default OfferEngineeringOutput;
