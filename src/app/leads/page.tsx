'use client';

import { useState, useEffect } from 'react';
import { Users, Search, Filter, ChevronDown, ChevronRight, Mail, Phone as PhoneIcon, Calendar, Bot, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { leados } from '@/lib/api';
import { ErrorBoundary } from '@/components/layout/error-boundary';

const stageColors: Record<string, string> = {
  new: 'bg-zinc-700 text-zinc-200',
  contacted: 'bg-blue-900/50 text-blue-300',
  qualified: 'bg-indigo-900/50 text-indigo-300',
  booked: 'bg-amber-900/50 text-amber-300',
  won: 'bg-emerald-900/50 text-emerald-300',
  lost: 'bg-red-900/50 text-red-300',
};

const mockInteractions = [
  { type: 'email_sent', content: 'Initial outreach — "Quick question about your growth strategy"', timestamp: '2026-03-01T10:00:00Z' },
  { type: 'email_opened', content: 'Email opened 3 times', timestamp: '2026-03-01T14:30:00Z' },
  { type: 'link_clicked', content: 'Clicked landing page link', timestamp: '2026-03-01T14:32:00Z' },
  { type: 'form_submitted', content: 'Submitted contact form with phone number', timestamp: '2026-03-02T09:15:00Z' },
  { type: 'ai_call', content: 'AI qualification call — Duration: 4m 32s — Score: 82/100 — Outcome: High Intent', timestamp: '2026-03-02T11:00:00Z' },
  { type: 'routed', content: 'Routed to sales calendar — Booking link sent', timestamp: '2026-03-02T11:05:00Z' },
];

const typeIcons: Record<string, typeof Mail> = {
  email_sent: Mail,
  email_opened: Mail,
  link_clicked: ChevronRight,
  form_submitted: Users,
  ai_call: Bot,
  routed: Calendar,
};

function LeadsPageInner() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (stageFilter) params.stage = stageFilter;
    if (sourceFilter) params.source = sourceFilter;
    leados.getLeads(params)
      .then(setLeads)
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, [stageFilter, sourceFilter]);

  const filtered = leads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.name?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Leads / CRM</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage and track all captured leads</p>
      </div>

      {/* Pipeline Stage Overview */}
      <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-6">
        {['new', 'contacted', 'qualified', 'booked', 'won', 'lost'].map(stage => {
          const count = leads.filter(l => l.stage === stage).length;
          return (
            <button
              key={stage}
              onClick={() => setStageFilter(stageFilter === stage ? '' : stage)}
              className={cn(
                'rounded-lg border p-3 text-center transition-all',
                stageFilter === stage ? 'border-indigo-500 bg-indigo-950/20' : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
              )}
            >
              <p className="text-lg font-bold text-white">{count}</p>
              <p className="text-xs capitalize text-zinc-400">{stage}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-10 pr-4 text-sm text-zinc-300 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-300 focus:outline-none"
        >
          <option value="">All Sources</option>
          <option value="google_ads">Google Ads</option>
          <option value="meta_ads">Meta Ads</option>
          <option value="linkedin">LinkedIn</option>
          <option value="cold_email">Cold Email</option>
          <option value="organic">Organic</option>
          <option value="referral">Referral</option>
        </select>
      </div>

      {/* Leads Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/80">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Company</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Source</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Score</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Stage</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Last Touch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No leads found</td></tr>
            ) : filtered.map((lead) => (
              <>
                <tr
                  key={lead.id}
                  onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
                  className="cursor-pointer transition-colors hover:bg-zinc-800/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ChevronRight className={cn('h-3.5 w-3.5 text-zinc-500 transition-transform', expandedLead === lead.id && 'rotate-90')} />
                      <div>
                        <p className="font-medium text-zinc-100">{lead.name}</p>
                        <p className="text-xs text-zinc-500">{lead.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{lead.company}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{lead.source?.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-800">
                        <div className={cn('h-full rounded-full', lead.score >= 80 ? 'bg-emerald-500' : lead.score >= 60 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${lead.score}%` }} />
                      </div>
                      <span className="text-xs text-zinc-400">{lead.score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', stageColors[lead.stage] || stageColors.new)}>
                      {lead.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(lead.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
                {expandedLead === lead.id && (
                  <tr key={`${lead.id}_expanded`}>
                    <td colSpan={6} className="bg-zinc-900/30 px-8 py-4">
                      <h4 className="mb-3 text-sm font-medium text-zinc-200">Activity Timeline</h4>
                      <div className="space-y-3">
                        {mockInteractions.map((interaction, i) => {
                          const Icon = typeIcons[interaction.type] || Mail;
                          return (
                            <div key={i} className="flex gap-3">
                              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800">
                                <Icon className="h-3 w-3 text-zinc-400" />
                              </div>
                              <div>
                                <p className="text-sm text-zinc-300">{interaction.content}</p>
                                <p className="text-xs text-zinc-500">{new Date(interaction.timestamp).toLocaleString()}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  return <ErrorBoundary><LeadsPageInner /></ErrorBoundary>;
}
