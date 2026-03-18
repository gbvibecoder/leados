'use client';

import { useState, useEffect, Fragment } from 'react';
import {
  Users, Search, ChevronRight, Mail, Phone as PhoneIcon, Calendar, Bot,
  Plus, X, ShieldBan, Target, Sparkles, TrendingUp, ArrowRight, Zap, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { leados, apiFetch } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { ProjectFilter } from '@/components/projects/project-filter';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import { motion, AnimatePresence } from 'framer-motion';

const STAGE_CONFIG: Record<string, { color: string; label: string }> = {
  new:       { color: '#6b7280', label: 'New' },
  contacted: { color: '#3b82f6', label: 'Contacted' },
  qualified: { color: '#00f2ff', label: 'Qualified' },
  booked:    { color: '#f59e0b', label: 'Booked' },
  won:       { color: '#10b981', label: 'Won' },
  lost:      { color: '#ef4444', label: 'Lost' },
};

const typeIcons: Record<string, typeof Mail> = {
  email_sent: Mail, email_opened: Mail, link_clicked: ChevronRight,
  form_submitted: Users, ai_call: Bot, routed: Calendar,
};

/* ═══ Add Lead Modal — Cosmic Glass ═══ */
function AddLeadModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { selectedProjectId, isBlacklisted } = useAppStore();
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', source: 'organic', stage: 'new', segment: 'smb', notes: '' });
  const [saving, setSaving] = useState(false);
  const [blacklisted, setBlacklisted] = useState(false);

  useEffect(() => {
    if (form.company) {
      const emailDomain = form.email?.split('@')[1];
      setBlacklisted(isBlacklisted(form.company, emailDomain));
    } else { setBlacklisted(false); }
  }, [form.company, form.email, isBlacklisted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/leados/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, projectId: selectedProjectId || undefined }),
      });
      onAdded();
      onClose();
    } catch { alert('Failed to add lead'); } finally { setSaving(false); }
  };

  const inputClass = "w-full rounded-xl px-4 py-2.5 text-sm cosmic-input";
  const selectClass = "rounded-xl px-4 py-2.5 text-sm text-gray-200 cosmic-input w-full";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md" onClick={onClose}>
      <motion.form initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.25 }}
        onSubmit={handleSubmit} onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ background: 'rgba(2,2,5,0.95)', border: '1px solid rgba(0,242,255,0.08)', backdropFilter: 'blur(20px)' }}>

        {/* Aurora top line */}
        <div className="absolute top-0 left-[15%] right-[15%] h-px aurora-bg" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,242,255,0.3), transparent)', backgroundSize: '300% 100%' }} />

        <div className="flex items-center justify-between">
          <div>
            <div className="mono-ui text-[8px] text-cyan-400/50 mb-1">New Contact</div>
            <h2 className="font-cinzel text-lg text-white">Add Lead</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        {selectedProjectId && <p className="text-xs text-cyan-400/70">Lead will be added to the selected project.</p>}
        {blacklisted && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <ShieldBan className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-400">Blacklisted company — lead will be flagged.</p>
          </div>
        )}

        <input required placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} />
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
          <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputClass} />
        </div>
        <input placeholder="Company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className={inputClass} />
        <div className="grid grid-cols-2 gap-3">
          <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className={selectClass}>
            <option value="google_ads">Google Ads</option><option value="meta_ads">Meta Ads</option><option value="linkedin">LinkedIn</option>
            <option value="cold_email">Cold Email</option><option value="organic">Organic</option><option value="referral">Referral</option><option value="webinar">Webinar</option>
          </select>
          <select value={form.segment} onChange={e => setForm({ ...form, segment: e.target.value })} className={selectClass}>
            <option value="enterprise">Enterprise</option><option value="mid_market">Mid-Market</option><option value="smb">SMB</option>
          </select>
        </div>
        <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass} />

        <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={saving}
          className="w-full rounded-xl py-3 text-sm font-medium text-cyan-400 transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.1), rgba(139,92,246,0.05))', border: '1px solid rgba(0,242,255,0.25)' }}>
          {saving ? 'Adding...' : 'Add Lead'}
        </motion.button>
      </motion.form>
    </motion.div>
  );
}

/* ═══ Main Page ═══ */
function LeadsPageInner() {
  const { selectedProjectId, loadProjects, loadBlacklist, isBlacklisted } = useAppStore();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => { loadProjects(); loadBlacklist(); }, [loadProjects, loadBlacklist]);

  const fetchLeads = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (stageFilter) params.stage = stageFilter;
    if (sourceFilter) params.source = sourceFilter;
    if (selectedProjectId) params.projectId = selectedProjectId;
    leados.getLeads(params).then(setLeads).catch(() => setLeads([])).finally(() => setLoading(false));
  };

  useEffect(() => { fetchLeads(); }, [stageFilter, sourceFilter, selectedProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = leads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.name?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q);
  });

  const stageOrder = ['new', 'contacted', 'qualified', 'booked', 'won', 'lost'];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">

      {/* ══════ HEADER ══════ */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden p-6"
        style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.03), rgba(139,92,246,0.02), rgba(2,2,5,0.8))', border: '1px solid rgba(0,242,255,0.08)' }}>
        {/* Mini orbit */}
        <div className="absolute top-1/2 right-8 -translate-y-1/2 w-20 h-20 pointer-events-none hidden md:block opacity-20">
          <div className="w-full h-full rounded-full border border-cyan-400/20 orbit-rotate">
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </div>
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="mono-ui text-[8px] text-cyan-400/50 mb-1.5 flex items-center gap-2">
              <span className="w-3 h-px bg-cyan-500/30" />Lead Management
            </div>
            <h1 className="font-cinzel text-2xl md:text-3xl text-white">Leads / CRM</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and track all captured leads &middot; {leads.length} total</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ProjectFilter />
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-cyan-400 transition-all"
              style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.08), rgba(139,92,246,0.05))', border: '1px solid rgba(0,242,255,0.2)' }}>
              <Plus className="h-4 w-4" /> Add Lead
            </motion.button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} onAdded={fetchLeads} />}
      </AnimatePresence>

      {/* ══════ STAGE PIPELINE — Planet Dots ══════ */}
      <motion.div initial="hidden" animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
        className="flex items-center gap-2 overflow-x-auto pb-1">
        {stageOrder.map((stage, i) => {
          const cfg = STAGE_CONFIG[stage];
          const count = leads.filter(l => l.stage === stage).length;
          const isActive = stageFilter === stage;
          return (
            <Fragment key={stage}>
              <motion.button
                variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } } }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setStageFilter(stageFilter === stage ? '' : stage)}
                className="relative flex flex-col items-center gap-2 rounded-2xl px-5 py-4 min-w-[100px] transition-all duration-300 group shrink-0"
                style={{
                  background: isActive ? `linear-gradient(135deg, ${cfg.color}12, rgba(2,2,5,0.6))` : 'rgba(2,2,5,0.4)',
                  border: `1px solid ${isActive ? `${cfg.color}35` : 'rgba(255,255,255,0.03)'}`,
                }}
              >
                {/* Active aurora line */}
                {isActive && <div className="absolute top-0 left-[20%] right-[20%] h-px" style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}50, transparent)` }} />}

                {/* Planet dot */}
                <div className="relative w-8 h-8">
                  {isActive && (
                    <div className="absolute inset-0 rounded-full" style={{ border: `1.5px solid ${cfg.color}30`, animation: 'pulse-ring 2.5s ease-out infinite' }} />
                  )}
                  <div className="absolute inset-1 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: `radial-gradient(circle at 40% 40%, ${cfg.color}25, ${cfg.color}08)`, color: cfg.color }}>
                    {count}
                  </div>
                </div>
                <span className="mono-ui text-[7px]" style={{ color: isActive ? cfg.color : '#6b7280' }}>{cfg.label}</span>
              </motion.button>

              {/* Connector line */}
              {i < stageOrder.length - 1 && (
                <div className="w-6 h-px shrink-0 hidden sm:block" style={{ background: `linear-gradient(90deg, ${cfg.color}15, ${STAGE_CONFIG[stageOrder[i + 1]].color}15)` }} />
              )}
            </Fragment>
          );
        })}
      </motion.div>

      {/* ══════ SEARCH & FILTERS ══════ */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name, company, email..."
            className="h-10 w-full rounded-xl pl-11 pr-4 text-sm cosmic-input" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600 pointer-events-none" />
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
            className="h-10 rounded-xl pl-9 pr-8 text-sm text-gray-300 cosmic-input appearance-none cursor-pointer">
            <option value="">All Sources</option>
            <option value="google_ads">Google Ads</option><option value="meta_ads">Meta Ads</option>
            <option value="linkedin">LinkedIn</option><option value="cold_email">Cold Email</option>
            <option value="organic">Organic</option><option value="referral">Referral</option>
          </select>
        </div>
      </div>

      {/* ══════ LEADS TABLE — Cosmic ══════ */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
        {/* Table header */}
        <div className="px-5 py-3 flex items-center gap-4 text-xs font-medium text-gray-500"
          style={{ background: 'rgba(2,2,5,0.7)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex-[2] min-w-0">Name</div>
          <div className="flex-1 hidden md:block">Company</div>
          <div className="flex-1 hidden sm:block">Source</div>
          <div className="w-28 hidden lg:block">Score</div>
          <div className="w-24">Stage</div>
          <div className="w-24 hidden sm:block text-right">Updated</div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16" style={{ background: 'rgba(2,2,5,0.4)' }}>
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border border-cyan-500/20 orbit-rotate">
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 6px #00f2ff' }} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center"><Zap className="h-4 w-4 text-cyan-400/40" /></div>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center" style={{ background: 'rgba(2,2,5,0.4)' }}>
            <Target className="h-8 w-8 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No leads found</p>
            <p className="text-xs text-gray-600 mt-1">Run your pipeline or add leads manually</p>
          </div>
        )}

        {/* Rows */}
        {!loading && filtered.map((lead, idx) => {
          const blacklisted = lead.company && isBlacklisted(lead.company, lead.email?.split('@')[1]);
          const isExpanded = expandedLead === lead.id;
          const displayScore = lead.qualificationScore ?? lead.score ?? 0;
          const stageCfg = STAGE_CONFIG[lead.stage] || STAGE_CONFIG.new;

          return (
            <Fragment key={lead.id}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                className="group flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-all duration-300"
                style={{
                  background: isExpanded ? 'rgba(0,242,255,0.02)' : blacklisted ? 'rgba(239,68,68,0.02)' : 'rgba(2,2,5,0.3)',
                  borderBottom: '1px solid rgba(255,255,255,0.025)',
                }}
              >
                {/* Name */}
                <div className="flex-[2] min-w-0 flex items-center gap-3">
                  <ChevronRight className={cn('h-3.5 w-3.5 text-gray-600 transition-transform shrink-0', isExpanded && 'rotate-90 text-cyan-400')} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-100 truncate group-hover:text-cyan-300 transition-colors">{lead.name}</p>
                      {blacklisted && <ShieldBan className="h-3 w-3 text-red-400 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-gray-600 truncate">{lead.email}</p>
                  </div>
                </div>

                {/* Company */}
                <div className="flex-1 hidden md:block text-sm text-gray-400 truncate">{lead.company}</div>

                {/* Source */}
                <div className="flex-1 hidden sm:block">
                  <span className="mono-ui text-[7px] text-gray-400 rounded px-2 py-0.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    {lead.source?.replace('_', ' ')}
                  </span>
                </div>

                {/* Score */}
                <div className="w-28 hidden lg:flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${displayScore}%`,
                        background: displayScore >= 80 ? '#10b981' : displayScore >= 60 ? '#f59e0b' : '#ef4444',
                        boxShadow: `0 0 6px ${displayScore >= 80 ? 'rgba(16,185,129,0.3)' : displayScore >= 60 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      }} />
                  </div>
                  <span className="mono-ui text-[8px] text-gray-500">{displayScore}</span>
                </div>

                {/* Stage */}
                <div className="w-24">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium capitalize"
                    style={{ color: stageCfg.color, background: `${stageCfg.color}12`, border: `1px solid ${stageCfg.color}20` }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: stageCfg.color, boxShadow: `0 0 4px ${stageCfg.color}40` }} />
                    {lead.stage}
                  </span>
                </div>

                {/* Updated */}
                <div className="w-24 hidden sm:block text-right">
                  <span className="mono-ui text-[8px] text-gray-600">{new Date(lead.updatedAt).toLocaleDateString()}</span>
                </div>
              </motion.div>

              {/* ── Expanded Detail Panel ── */}
              <AnimatePresence>
              {isExpanded && (
                <motion.div key={`${lead.id}_detail`}
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}>
                  <div className="px-6 py-5" style={{ background: 'rgba(0,242,255,0.015)', borderBottom: '1px solid rgba(0,242,255,0.06)' }}>
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Contact Info */}
                      <div>
                        <h4 className="mono-ui text-[8px] text-cyan-400/60 mb-3 flex items-center gap-2">
                          <span className="w-3 h-px bg-cyan-500/30" />Contact Info
                        </h4>
                        <div className="space-y-2.5">
                          {lead.email && (
                            <div className="flex items-center gap-3 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
                              <Mail className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                              <span className="text-sm text-gray-300">{lead.email}</span>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-3 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
                              <PhoneIcon className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                              <span className="text-sm text-gray-300">{lead.phone}</span>
                            </div>
                          )}
                          {lead.segment && (
                            <div className="flex items-center gap-3 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
                              <Target className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                              <span className="text-sm text-gray-300 capitalize">{lead.segment?.replace('_', ' ')}</span>
                            </div>
                          )}
                          {blacklisted && (
                            <div className="flex items-center gap-2 rounded-xl p-2.5" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}>
                              <ShieldBan className="h-3.5 w-3.5 text-red-400 shrink-0" />
                              <span className="text-xs text-red-400">Blacklisted company</span>
                            </div>
                          )}
                          {lead.notes && (
                            <p className="text-xs text-gray-500 italic pl-1 border-l-2 ml-1" style={{ borderColor: 'rgba(0,242,255,0.15)' }}>{lead.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* Activity Timeline */}
                      <div>
                        <h4 className="mono-ui text-[8px] text-cyan-400/60 mb-3 flex items-center gap-2">
                          <span className="w-3 h-px bg-cyan-500/30" />Activity Timeline
                        </h4>
                        {lead.interactions && lead.interactions.length > 0 ? (
                          <div className="space-y-3 relative">
                            {/* Timeline line */}
                            <div className="absolute left-3 top-3 bottom-3 w-px" style={{ background: 'linear-gradient(to bottom, rgba(0,242,255,0.1), rgba(0,242,255,0.03))' }} />
                            {lead.interactions.map((interaction: any, i: number) => {
                              const Icon = typeIcons[interaction.type] || Mail;
                              return (
                                <div key={i} className="flex gap-3 relative">
                                  <div className="relative shrink-0 mt-0.5">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center"
                                      style={{ background: 'rgba(0,242,255,0.06)', border: '1px solid rgba(0,242,255,0.1)' }}>
                                      <Icon className="h-3 w-3 text-cyan-400/60" />
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-300">{interaction.content}</p>
                                    <p className="mono-ui text-[7px] text-gray-600 mt-0.5">{new Date(interaction.timestamp).toLocaleString()}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-6" style={{ background: 'rgba(255,255,255,0.01)', borderRadius: 12 }}>
                            <Bot className="h-6 w-6 text-gray-700 mx-auto mb-2" />
                            <p className="text-xs text-gray-600">No interactions yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default function LeadsPage() {
  return <ErrorBoundary><LeadsPageInner /></ErrorBoundary>;
}
