'use client';

import { useState, useEffect, Fragment } from 'react';
import { Users, Search, ChevronRight, Mail, Phone as PhoneIcon, Calendar, Bot, Plus, X, ShieldBan } from 'lucide-react';
import { cn } from '@/lib/utils';
import { leados, apiFetch } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { ProjectFilter } from '@/components/projects/project-filter';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import { motion, AnimatePresence } from 'framer-motion';

const stageColors: Record<string, string> = {
  new: 'bg-zinc-700 text-gray-200',
  contacted: 'bg-blue-900/50 text-blue-300',
  qualified: 'bg-cyan-900/50 text-cyan-300',
  booked: 'bg-amber-900/50 text-amber-300',
  won: 'bg-emerald-900/50 text-emerald-300',
  lost: 'bg-red-900/50 text-red-300',
};

const typeIcons: Record<string, typeof Mail> = {
  email_sent: Mail,
  email_opened: Mail,
  link_clicked: ChevronRight,
  form_submitted: Users,
  ai_call: Bot,
  routed: Calendar,
};

function AddLeadModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { selectedProjectId, isBlacklisted } = useAppStore();
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', source: 'organic', stage: 'new', segment: 'smb', notes: '' });
  const [saving, setSaving] = useState(false);
  const [blacklisted, setBlacklisted] = useState(false);

  // Check blacklist when company changes
  useEffect(() => {
    if (form.company) {
      const emailDomain = form.email?.split('@')[1];
      setBlacklisted(isBlacklisted(form.company, emailDomain));
    } else {
      setBlacklisted(false);
    }
  }, [form.company, form.email, isBlacklisted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/leados/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          projectId: selectedProjectId || undefined,
        }),
      });
      onAdded();
      onClose();
    } catch {
      alert('Failed to add lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <motion.form
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
        onSubmit={handleSubmit} className="w-full max-w-md rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Add New Lead</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        {selectedProjectId && (
          <p className="text-xs text-cyan-400">Lead will be added to the currently selected project.</p>
        )}
        {blacklisted && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
            <ShieldBan className="h-4 w-4 text-red-400" />
            <p className="text-xs text-red-400">This company is on the blacklist. Lead will still be created but flagged.</p>
          </div>
        )}
        <input required placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-cyan-400 focus:outline-none" />
        <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-cyan-400 focus:outline-none" />
        <input placeholder="Company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="w-full rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-cyan-400 focus:outline-none" />
        <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-cyan-400 focus:outline-none" />
        <div className="grid grid-cols-2 gap-3">
          <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 text-sm text-gray-200 focus:outline-none">
            <option value="google_ads">Google Ads</option>
            <option value="meta_ads">Meta Ads</option>
            <option value="linkedin">LinkedIn</option>
            <option value="cold_email">Cold Email</option>
            <option value="organic">Organic</option>
            <option value="referral">Referral</option>
            <option value="webinar">Webinar</option>
          </select>
          <select value={form.segment} onChange={e => setForm({ ...form, segment: e.target.value })} className="rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 text-sm text-gray-200 focus:outline-none">
            <option value="enterprise">Enterprise</option>
            <option value="mid_market">Mid-Market</option>
            <option value="smb">SMB</option>
          </select>
        </div>
        <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-cyan-400 focus:outline-none" />
        <button type="submit" disabled={saving} className="w-full rounded-lg bg-cyan-600 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50">
          {saving ? 'Adding...' : 'Add Lead'}
        </button>
      </motion.form>
    </motion.div>
  );
}

function LeadsPageInner() {
  const { selectedProjectId, loadProjects, loadBlacklist, isBlacklisted } = useAppStore();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadProjects();
    loadBlacklist();
  }, [loadProjects, loadBlacklist]);

  const fetchLeads = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (stageFilter) params.stage = stageFilter;
    if (sourceFilter) params.source = sourceFilter;
    if (selectedProjectId) params.projectId = selectedProjectId;
    leados.getLeads(params)
      .then(setLeads)
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeads();
  }, [stageFilter, sourceFilter, selectedProjectId]);

  const filtered = leads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.name?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Leads / CRM</h1>
          <p className="mt-1 text-sm text-gray-400">Manage and track all captured leads &middot; {leads.length} total</p>
        </div>
        <div className="flex items-center gap-3">
          <ProjectFilter />
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500">
            <Plus className="h-4 w-4" /> Add Lead
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} onAdded={fetchLeads} />}
      </AnimatePresence>

      {/* Pipeline Stage Overview */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
        className="grid gap-3 sm:grid-cols-3 md:grid-cols-6">
        {['new', 'contacted', 'qualified', 'booked', 'won', 'lost'].map(stage => {
          const count = leads.filter(l => l.stage === stage).length;
          return (
            <motion.button
              key={stage}
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}
              onClick={() => setStageFilter(stageFilter === stage ? '' : stage)}
              className={cn(
                'rounded-lg border p-3 text-center transition-all',
                stageFilter === stage ? 'border-cyan-500 bg-cyan-950/20' : 'border-white/[0.04] bg-[rgba(2,2,5,0.6)]/50 hover:border-cyan-500/15'
              )}
            >
              <p className="text-lg font-bold text-white">{count}</p>
              <p className="text-xs capitalize text-gray-400">{stage}</p>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="h-9 w-full rounded-lg border border-white/[0.06] bg-white/[0.02] pl-10 pr-4 text-sm text-gray-300 placeholder-gray-600 focus:border-cyan-400 focus:outline-none"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="h-9 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 text-sm text-gray-300 focus:outline-none"
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
      <div className="overflow-x-auto rounded-xl border border-white/[0.04]">
        <table className="w-full text-sm">
          <thead className="border-b border-white/[0.04] bg-[rgba(2,2,5,0.6)]/80">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Company</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Source</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Score</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Stage</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Last Touch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No leads found</td></tr>
            ) : filtered.map((lead) => {
              const blacklisted = lead.company && isBlacklisted(lead.company, lead.email?.split('@')[1]);
              return (
                <Fragment key={lead.id}>
                  <tr
                    onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-white/5/30',
                      blacklisted && 'bg-red-950/10'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ChevronRight className={cn('h-3.5 w-3.5 text-gray-500 transition-transform', expandedLead === lead.id && 'rotate-90')} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-100">{lead.name}</p>
                            {blacklisted && (
                              <span title="Blacklisted company"><ShieldBan className="h-3.5 w-3.5 text-red-400" /></span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{lead.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{lead.company}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-gray-300">{lead.source?.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const displayScore = lead.qualificationScore ?? lead.score ?? 0;
                          return (
                            <>
                              <div className="h-2 w-16 overflow-hidden rounded-full bg-white/5">
                                <div className={cn('h-full rounded-full', displayScore >= 80 ? 'bg-emerald-500' : displayScore >= 60 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${displayScore}%` }} />
                              </div>
                              <span className="text-xs text-gray-400">{displayScore}</span>
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', stageColors[lead.stage] || stageColors.new)}>
                        {lead.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(lead.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                  {expandedLead === lead.id && (
                    <tr key={`${lead.id}_expanded`}>
                      <td colSpan={6} className="bg-zinc-900/30 px-8 py-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="mb-2 text-sm font-medium text-gray-200">Contact Info</h4>
                            <div className="space-y-1 text-sm text-gray-400">
                              {lead.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {lead.email}</p>}
                              {lead.phone && <p className="flex items-center gap-2"><PhoneIcon className="h-3.5 w-3.5" /> {lead.phone}</p>}
                              {lead.segment && <p>Segment: <span className="capitalize text-gray-300">{lead.segment?.replace('_', ' ')}</span></p>}
                              {blacklisted && (
                                <p className="mt-2 flex items-center gap-1 text-red-400">
                                  <ShieldBan className="h-3.5 w-3.5" /> Blacklisted company
                                </p>
                              )}
                              {lead.notes && <p className="mt-2 text-gray-500 italic">{lead.notes}</p>}
                            </div>
                          </div>
                          <div>
                            <h4 className="mb-2 text-sm font-medium text-gray-200">Activity Timeline</h4>
                            {lead.interactions && lead.interactions.length > 0 ? (
                              <div className="space-y-3">
                                {lead.interactions.map((interaction: any, i: number) => {
                                  const Icon = typeIcons[interaction.type] || Mail;
                                  return (
                                    <div key={i} className="flex gap-3">
                                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5">
                                        <Icon className="h-3 w-3 text-gray-400" />
                                      </div>
                                      <div>
                                        <p className="text-sm text-gray-300">{interaction.content}</p>
                                        <p className="text-xs text-gray-500">{new Date(interaction.timestamp).toLocaleString()}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">No interactions recorded yet</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  return <ErrorBoundary><LeadsPageInner /></ErrorBoundary>;
}
