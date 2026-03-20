import 'dotenv/config';
import { PrismaClient } from './src/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  // Create a new pipeline
  const pipeline = await prisma.pipeline.create({
    data: { type: 'leados', status: 'pending' },
  });
  console.log(`Pipeline created: ${pipeline.id}`);

  // Copy the first 4 completed agent outputs from the last successful pipeline
  const priorAgents = ['service-research', 'offer-engineering', 'validation', 'funnel-builder'];
  for (const agentId of priorAgents) {
    const lastRun = await prisma.agentRun.findFirst({
      where: { agentId, status: 'done' },
      orderBy: { completedAt: 'desc' },
    });
    if (lastRun) {
      await prisma.agentRun.create({
        data: {
          pipelineId: pipeline.id,
          agentId: lastRun.agentId,
          agentName: lastRun.agentName,
          status: 'done',
          inputsJson: lastRun.inputsJson,
          outputsJson: lastRun.outputsJson,
          startedAt: lastRun.startedAt,
          completedAt: lastRun.completedAt,
        },
      });
      console.log(`  Copied: ${agentId}`);
    }
  }

  // Set pipeline config to only run agents from content-creative onwards
  const agentsToRun = [
    'content-creative', 'paid-traffic', 'outbound-outreach', 'inbound-capture',
    'ai-qualification', 'sales-routing', 'tracking-attribution',
    'performance-optimization', 'crm-hygiene',
  ];

  await prisma.pipeline.update({
    where: { id: pipeline.id },
    data: {
      config: JSON.stringify({ enabledAgentIds: agentsToRun }),
    },
  });

  console.log(`\nStarting pipeline from content-creative (9 agents)...\n`);

  const res = await fetch(`http://localhost:3000/api/pipelines/${pipeline.id}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  console.log(`Started: ${data.totalAgents} agents — ${JSON.stringify(data.agentsToRun)}\n`);

  // Monitor
  const printed = new Set<string>();
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 30000));
    const runs = await prisma.agentRun.findMany({
      where: { pipelineId: pipeline.id, agentId: { in: agentsToRun } },
      orderBy: { startedAt: 'asc' },
    });
    const p = await prisma.pipeline.findUnique({ where: { id: pipeline.id }, select: { status: true } });
    const now = new Date().toISOString().substring(11, 19);

    for (const r of runs) {
      const dur = r.completedAt && r.startedAt
        ? Math.round((r.completedAt.getTime() - r.startedAt.getTime()) / 1000) + 's' : '...';
      if (r.status === 'done' && !printed.has(r.agentId)) {
        console.log(`[${now}]  OK  ${r.agentId.padEnd(25)} ${dur}`);
        printed.add(r.agentId);
      } else if (r.status === 'error' && !printed.has(r.agentId)) {
        console.log(`[${now}] ERR  ${r.agentId.padEnd(25)} ${dur}  ${r.error?.substring(0, 80)}`);
        printed.add(r.agentId);
      } else if (r.status === 'running') {
        const elapsed = r.startedAt ? Math.round((Date.now() - r.startedAt.getTime()) / 1000) : 0;
        console.log(`[${now}]  >>  ${r.agentId.padEnd(25)} ${elapsed}s elapsed`);
      }
    }

    if (p?.status === 'completed') {
      console.log(`\n=== PIPELINE COMPLETED ===\n--- Summary ---`);
      for (const r of runs) {
        const dur = r.completedAt && r.startedAt ? Math.round((r.completedAt.getTime() - r.startedAt.getTime()) / 1000) : 0;
        console.log(`${r.agentId.padEnd(25)} ${String(dur + 's').padEnd(6)} ${r.status}`);
      }
      break;
    }
    if (p?.status === 'error') {
      console.log(`\n=== PIPELINE FAILED ===`);
      const failedRun = runs.find(r => r.status === 'error');
      if (failedRun) console.log(`Failed at: ${failedRun.agentId} — ${failedRun.error}`);
      break;
    }
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
