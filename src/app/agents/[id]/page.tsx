'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, Clock, FileJson, Terminal, CheckCircle2, AlertCircle, Loader2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { agents as agentsApi } from '@/lib/api';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import Link from 'next/link';

const agentDescriptions: Record<string, { description: string; inputs: string; outputs: string }> = {
  'service-research': { description: 'Discovers high-demand service opportunities via Google Trends, Reddit, LinkedIn, and Upwork. Analyzes market signals for demand scoring, competition analysis, and monetization potential.', inputs: 'Trend platforms, job boards, market data', outputs: 'Ranked list of service opportunities with demand/competition/monetization scores' },
  'offer-engineering': { description: 'Packages identified service opportunities into compelling offers with ICP definition, pain point analysis, transformation promise, pricing tiers, and guarantees.', inputs: 'Service opportunity data from Research Agent', outputs: 'Complete offer package with ICP, pricing, positioning' },
  'validation': { description: 'Evaluates service viability through market demand analysis, competition scoring, CAC vs LTV modeling, and risk assessment. Returns GO/NO-GO decision.', inputs: 'Offer data, market data', outputs: 'GO/NO-GO decision with risk score and detailed reasoning' },
  'funnel-builder': { description: 'Builds acquisition infrastructure including landing pages, lead capture forms, booking integration, and CRM setup.', inputs: 'Offer details, copy assets', outputs: 'Live landing page URL with forms and tracking' },
  'content-creative': { description: 'Produces all creative assets: ad copies, hooks, email sequences, LinkedIn scripts, and video scripts optimized per channel and ICP.', inputs: 'ICP, offer details', outputs: 'Full creative asset package' },
  'paid-traffic': { description: 'Manages Google Ads + Meta Ads campaigns including keyword research, audience targeting, bidding strategies, and budget allocation.', inputs: 'Landing page URL, creative assets', outputs: 'Live ad campaign configurations' },
  'outbound-outreach': { description: 'Orchestrates cold email sequences via Instantly/Smartlead and LinkedIn DM automation with personalization at scale.', inputs: 'ICP, offer details', outputs: 'Active outreach sequences' },
  'inbound-capture': { description: 'Captures and processes inbound leads from forms, chat, and webhooks. Enriches data via Apollo/Clay/Clearbit.', inputs: 'Form submissions, ad leads', outputs: 'Enriched CRM records' },
  'ai-qualification': { description: 'Conducts AI voice calls to qualify leads using BANT criteria. Scores responses, handles objections, and determines intent level.', inputs: 'Lead list from CRM', outputs: 'Qualified leads with scores and routing recommendations' },
  'sales-routing': { description: 'Routes qualified leads based on intent and complexity: high intent + budget → checkout, high intent + complex → sales call, medium → nurture, low → archive.', inputs: 'Qualification scores', outputs: 'Routed leads with assignment' },
  'tracking-attribution': { description: 'Sets up complete analytics infrastructure: GTM, Meta Pixel, Google Ads conversion tracking, and multi-touch attribution model.', inputs: 'All campaign IDs', outputs: 'Full analytics infrastructure configuration' },
  'performance-optimization': { description: 'Monitors CPL/CAC/ROAS/LTV metrics in real-time. Automatically kills underperformers, scales winners, and adjusts budgets.', inputs: 'Live campaign data', outputs: 'Optimization actions and performance reports' },
  'crm-hygiene': { description: 'Deduplicates (>99% accuracy), normalizes, and enriches all lead data. Manages pipeline stages and maintains audit trail of all touches.', inputs: 'All agent outputs', outputs: 'Clean CRM records, single source of truth' },
};

function AgentDetailPageInner() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;
  const [agent, setAgent] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [configJson, setConfigJson] = useState('{\n  "mode": "default"\n}');

  useEffect(() => {
    agentsApi.get(agentId).then(setAgent).catch(() => {});
    agentsApi.runs(agentId).then(setRuns).catch(() => setRuns([]));
  }, [agentId]);

  const info = agentDescriptions[agentId] || { description: agent?.description || 'Agent module', inputs: 'Various', outputs: 'Structured JSON' };

  const handleRun = async () => {
    setRunning(true);
    try {
      const result = await agentsApi.run(agentId, { config: JSON.parse(configJson) });
      setRuns([result, ...runs]);
      setSelectedRun(result);
    } catch {}
    setRunning(false);
  };

  const statusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: typeof Bot }> = {
      idle: { color: 'text-zinc-400', icon: Clock },
      running: { color: 'text-blue-400', icon: Loader2 },
      done: { color: 'text-emerald-400', icon: CheckCircle2 },
      error: { color: 'text-red-400', icon: AlertCircle },
    };
    const c = config[status] || config.idle;
    const Icon = c.icon;
    return (
      <span className={cn('flex items-center gap-1.5 text-sm font-medium', c.color)}>
        <Icon className={cn('h-4 w-4', status === 'running' && 'animate-spin')} />
        {status?.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{agent?.name || agentId}</h1>
          <p className="text-sm text-zinc-400">{agentId}</p>
        </div>
        {statusBadge(running ? 'running' : 'idle')}
      </div>

      {/* Description */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="mb-2 text-sm font-semibold text-zinc-200">Description</h3>
        <p className="text-sm text-zinc-300">{info.description}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-zinc-400">Key Inputs</p>
            <p className="mt-1 text-sm text-zinc-300">{info.inputs}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-400">Key Outputs</p>
            <p className="mt-1 text-sm text-zinc-300">{info.outputs}</p>
          </div>
        </div>
      </div>

      {/* Config + Run */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">Input Configuration</h3>
          <textarea
            value={configJson}
            onChange={(e) => setConfigJson(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 font-mono text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleRun}
            disabled={running}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-70"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? 'Running...' : 'Run Agent'}
          </button>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <Clock className="h-4 w-4" /> Run History
          </h3>
          {runs.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">No runs yet</p>
          ) : (
            <div className="space-y-2">
              {runs.map((run: any) => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className={cn(
                    'w-full rounded-lg border p-3 text-left transition-all',
                    selectedRun?.id === run.id ? 'border-indigo-500 bg-indigo-950/20' : 'border-zinc-800 hover:border-zinc-700'
                  )}
                >
                  <div className="flex items-center justify-between">
                    {statusBadge(run.status)}
                    <span className="text-xs text-zinc-500">
                      {run.startedAt ? new Date(run.startedAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Output Viewer */}
      {selectedRun && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <FileJson className="h-4 w-4" /> Output Log
          </h3>
          <pre className="max-h-96 overflow-auto rounded-lg border border-zinc-700 bg-zinc-800 p-4 text-xs text-zinc-300">
            {JSON.stringify(selectedRun.outputsJson || selectedRun.outputs || {}, null, 2)}
          </pre>
          {selectedRun.error && (
            <div className="mt-3">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-red-400">
                <Terminal className="h-4 w-4" /> Error
              </h4>
              <pre className="rounded-lg border border-red-800/50 bg-red-950/20 p-3 text-xs text-red-300">{selectedRun.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentDetailPage() {
  return <ErrorBoundary><AgentDetailPageInner /></ErrorBoundary>;
}
