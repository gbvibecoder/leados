import { BaseAgent } from './base-agent';
import { createLeadOSAgents } from './leados/index';

export function createAllAgents(): Map<string, BaseAgent> {
  return createLeadOSAgents();
}

export { BaseAgent } from './base-agent';
export { createLeadOSAgents } from './leados/index';
