'use client';

import React from 'react';
import { ServiceResearchOutput } from './outputs/ServiceResearchOutput';
import { OfferEngineeringOutput } from './outputs/OfferEngineeringOutput';
import { ValidationOutput } from './outputs/ValidationOutput';
import { FunnelBuilderOutput } from './outputs/FunnelBuilderOutput';
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

    // TODO: Add more agent-specific outputs
    case 'content-creative':
    case 'paid-traffic':
    case 'outbound-outreach':
    case 'inbound-capture':
    case 'qualification':
    case 'sales-routing':
    case 'tracking-attribution':
    case 'performance-optimization':
    case 'crm-hygiene':
    default:
      // Fallback to generic interactive output
      return <GenericAgentOutput data={data} agentId={agentId} agentName={agentName} />;
  }
}

export default AgentOutput;
