'use client';

import React from 'react';
import { ServiceResearchOutput } from './outputs/ServiceResearchOutput';
import { OfferEngineeringOutput } from './outputs/OfferEngineeringOutput';
import { ValidationOutput } from './outputs/ValidationOutput';
import { FunnelBuilderOutput } from './outputs/FunnelBuilderOutput';
import { ContentCreativeOutput } from './outputs/ContentCreativeOutput';
import { PaidTrafficOutput } from './outputs/PaidTrafficOutput';
import { OutboundOutreachOutput } from './outputs/OutboundOutreachOutput';
import { InboundCaptureOutput } from './outputs/InboundCaptureOutput';
import { AIQualificationOutput } from './outputs/AIQualificationOutput';
import { SalesRoutingOutput } from './outputs/SalesRoutingOutput';
import { TrackingAttributionOutput } from './outputs/TrackingAttributionOutput';
import { PerformanceOptimizationOutput } from './outputs/PerformanceOptimizationOutput';
import { CRMHygieneOutput } from './outputs/CRMHygieneOutput';
import { GenericAgentOutput } from './outputs/GenericAgentOutput';

interface AgentOutputProps {
  agentId: string;
  agentName?: string;
  data: any;
  isLive?: boolean;
  agentRunId?: string;
  onResolved?: (resolvedData: any) => void;
}

/**
 * Routes to the appropriate output component based on agent ID
 * Provides interactive, user-friendly displays instead of raw JSON
 */
export function AgentOutput({ agentId, agentName, data, isLive = false, agentRunId, onResolved }: AgentOutputProps) {
  // Normalize: if data is a string (double-serialized), parse it
  let normalizedData = data;
  if (typeof normalizedData === 'string') {
    try { normalizedData = JSON.parse(normalizedData); } catch { /* keep as-is */ }
  }

  // Check for error output — show error message instead of "no data yet" placeholder
  const errorMsg = normalizedData?.error
    || normalizedData?.data?.error
    || (normalizedData?.success === false && normalizedData?.reasoning);
  if (errorMsg) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-950/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-red-400">Agent Error</span>
        </div>
        <p className="text-sm text-red-300/80">{typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}</p>
        {normalizedData?.reasoning && normalizedData.reasoning !== errorMsg && (
          <p className="text-xs text-zinc-500 mt-2">{normalizedData.reasoning}</p>
        )}
      </div>
    );
  }

  // Pass the normalized data object - components will handle nested structure internally
  switch (agentId) {
    case 'service-research':
      // Service Research uses live API data
      return <ServiceResearchOutput data={normalizedData} isLive={isLive} />;

    case 'offer-engineering':
      return <OfferEngineeringOutput data={normalizedData} />;

    case 'validation':
      return <ValidationOutput data={normalizedData} />;

    case 'funnel-builder':
      return <FunnelBuilderOutput data={normalizedData} />;

    case 'content-creative':
      return <ContentCreativeOutput data={normalizedData} />;

    case 'paid-traffic':
      return <PaidTrafficOutput data={normalizedData} />;

    case 'outbound-outreach':
      return <OutboundOutreachOutput data={normalizedData} />;

    case 'inbound-capture':
      return <InboundCaptureOutput data={normalizedData} />;

    case 'ai-qualification':
      return <AIQualificationOutput data={normalizedData} agentRunId={agentRunId} onResolved={onResolved} />;

    case 'sales-routing':
      return <SalesRoutingOutput data={normalizedData} />;

    case 'tracking-attribution':
      return <TrackingAttributionOutput data={normalizedData} />;

    case 'performance-optimization':
      return <PerformanceOptimizationOutput data={normalizedData} />;

    case 'crm-hygiene':
      return <CRMHygieneOutput data={normalizedData} />;

    default:
      // Fallback to generic interactive output
      return <GenericAgentOutput data={normalizedData} agentId={agentId} agentName={agentName} />;
  }
}

export default AgentOutput;
