import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export async function GET(req: Request) {
  const userId = getUserId(req);

  // Fetch recent interactions with their lead info (scoped by userId via lead)
  const interactions = await prisma.interaction.findMany({
    where: { ...(userId && { lead: { userId } }) },
    orderBy: { timestamp: 'desc' },
    take: 10,
    include: {
      lead: { select: { name: true } },
    },
  });

  // Fetch recent agent runs (scoped by userId via pipeline)
  const agentRuns = await prisma.agentRun.findMany({
    where: { ...(userId && { pipeline: { userId } }) },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      agentName: true,
      status: true,
      createdAt: true,
      completedAt: true,
    },
  });

  // Merge and format into activity items
  const activities = [
    ...interactions.map(i => ({
      id: i.id,
      type: mapInteractionType(i.type),
      message: formatInteractionMessage(i.type, i.content, i.lead?.name),
      agentName: mapInteractionAgent(i.type),
      timestamp: i.timestamp.toISOString(),
    })),
    ...agentRuns.map(r => ({
      id: r.id,
      type: r.status === 'error' ? 'agent_error' as const
        : r.status === 'done' ? 'agent_completed' as const
        : 'agent_started' as const,
      message: `${r.agentName} ${r.status === 'done' ? 'completed' : r.status === 'error' ? 'failed' : 'started'}`,
      agentName: r.agentName,
      timestamp: (r.completedAt || r.createdAt).toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  return NextResponse.json(activities);
}

function mapInteractionType(type: string): 'agent_completed' | 'info' | 'agent_started' {
  switch (type) {
    case 'ai_call':
    case 'routed':
      return 'agent_completed';
    case 'email_sent':
    case 'form_submitted':
      return 'agent_started';
    default:
      return 'info';
  }
}

function formatInteractionMessage(type: string, content: string, leadName?: string | null): string {
  const name = leadName || 'Unknown lead';
  switch (type) {
    case 'email_sent': return `Email sent to ${name}`;
    case 'email_opened': return `${name} opened email`;
    case 'link_clicked': return `${name} clicked link`;
    case 'form_submitted': return `${name} submitted form`;
    case 'ai_call': return `AI qualification call with ${name}`;
    case 'routed': return `${name} routed to sales`;
    default: return content || `Activity for ${name}`;
  }
}

function mapInteractionAgent(type: string): string | undefined {
  switch (type) {
    case 'email_sent': return 'Outbound Outreach Agent';
    case 'email_opened':
    case 'link_clicked': return 'Tracking & Attribution Agent';
    case 'form_submitted': return 'Inbound Lead Capture Agent';
    case 'ai_call': return 'AI Qualification Agent';
    case 'routed': return 'Sales Routing Agent';
    default: return undefined;
  }
}
