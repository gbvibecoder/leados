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
}

/**
 * Routes to the appropriate output component based on agent ID
 * Provides interactive, user-friendly displays instead of raw JSON
 */
export function AgentOutput({ agentId, agentName, data, isLive = false }: AgentOutputProps) {
  // Normalize: if data is a string (double-serialized), parse it
  let normalizedData = data;
  if (typeof normalizedData === 'string') {
    try { normalizedData = JSON.parse(normalizedData); } catch { /* keep as-is */ }
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
      return <AIQualificationOutput data={normalizedData} />;

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
