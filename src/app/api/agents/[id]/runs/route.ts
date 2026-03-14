import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchRealTrends } from '@/lib/real-trends';
import { fetchLiveAgentData } from '@/lib/live-agent-data';
import { getUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);

  // First, check database for real agent runs
  try {
    const dbRuns = await prisma.agentRun.findMany({
      where: { agentId: id, ...(userId && { pipeline: { userId } }) },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (dbRuns.length > 0) {
      const runs = dbRuns.map((run: any) => ({
        id: run.id,
        agentId: run.agentId,
        agentName: run.agentName,
        status: run.status,
        outputsJson: run.outputsJson ? JSON.parse(run.outputsJson) : null,
        error: run.error,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        createdAt: run.createdAt,
      }));
      return NextResponse.json(runs);
    }
  } catch {
    // Database not available, fall through to live data
  }

  // No DB runs — generate LIVE data from free APIs (Reddit, HN, Google Trends)
  try {
    let liveOutput: any;

    if (id === 'service-research') {
      // Service Research uses dedicated trend fetcher
      const liveData = await fetchRealTrends('B2B services', 'US');
      liveOutput = {
        success: true,
        ...liveData,
        isLive: true,
      };
    } else {
      // All other agents use the live agent data service
      liveOutput = await fetchLiveAgentData(id);
    }

    const timestamp = new Date().toISOString();

    return NextResponse.json([
      {
        id: `run_${id}_live_${Date.now()}`,
        agentId: id,
        status: 'done',
        outputsJson: liveOutput,
        startedAt: timestamp,
        completedAt: timestamp,
      },
    ]);
  } catch (error) {
    console.error(`Failed to fetch live data for agent ${id}:`, error);

    // Fallback: return minimal valid output
    return NextResponse.json([
      {
        id: `run_${id}_error`,
        agentId: id,
        status: 'done',
        outputsJson: {
          success: false,
          data: { message: `Live data fetch failed for ${id}. Please retry.` },
          reasoning: 'Unable to fetch real-time data from APIs. Check network connectivity.',
          confidence: 0,
        },
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    ]);
  }
}

/** DELETE /api/agents/[id]/runs — Clear all run history for this agent */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);

  try {
    await prisma.agentRun.deleteMany({
      where: { agentId: id, ...(userId && { pipeline: { userId } }) },
    });
    return NextResponse.json({ success: true, message: `Cleared runs for ${id}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
