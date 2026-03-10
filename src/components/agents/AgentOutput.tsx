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
  // Pass the full data object - components will handle nested structure internally
  switch (agentId) {
    case 'service-research':
      // Service Research uses live API data
      return <ServiceResearchOutput data={data} isLive={isLive} />;

    case 'offer-engineering':
      return <OfferEngineeringOutput data={data} />;

    case 'validation':
      return <ValidationOutput data={data} />;

    case 'funnel-builder':
      return <FunnelBuilderOutput data={data} />;

    case 'content-creative':
      return <ContentCreativeOutput data={data} />;

    case 'paid-traffic':
      return <PaidTrafficOutput data={data} />;

    case 'outbound-outreach':
      return <OutboundOutreachOutput data={data} />;

    case 'inbound-capture':
      return <InboundCaptureOutput data={data} />;

    case 'ai-qualification':
      return <AIQualificationOutput data={data} />;

    case 'sales-routing':
      return <SalesRoutingOutput data={data} />;

    case 'tracking-attribution':
      return <TrackingAttributionOutput data={data} />;

    case 'performance-optimization':
      return <PerformanceOptimizationOutput data={data} />;

    case 'crm-hygiene':
      return <CRMHygieneOutput data={data} />;

    default:
      // Fallback to generic interactive output
      return <GenericAgentOutput data={data} agentId={agentId} agentName={agentName} />;
  }
}

export default AgentOutput;
