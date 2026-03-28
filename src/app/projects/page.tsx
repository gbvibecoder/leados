'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Building2, Globe, ArrowRight, Trash2, AlertTriangle, X,
  ChevronDown, Check, Link2, Bot, Pencil, Zap, Rocket, Sparkles, Languages,
  Megaphone, Key, Eye, EyeOff, ChevronRight, SkipForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, DISCOVERY_AGENT_IDS, LEADOS_AGENTS, SUPPORTED_LANGUAGES } from '@/lib/store';
import type { Project, MetaAdConfig } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, selectProject, createProjectAsync, removeProject, updateProject, loadProjects } = useAppStore();
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newLanguage, setNewLanguage] = useState('en');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [newType, setNewType] = useState<'internal' | 'external'>('internal');
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(
    new Set(LEADOS_AGENTS.filter(a => !DISCOVERY_AGENT_IDS.includes(a.id)).map(a => a.id))
  );
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [urlError, setUrlError] = useState('');
  // Meta Ad config (step 2)
  const [metaAppId, setMetaAppId] = useState('');
  const [metaAppSecret, setMetaAppSecret] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [metaAdAccountId, setMetaAdAccountId] = useState('');
  const [showMetaSecret, setShowMetaSecret] = useState(false);
  const [showMetaToken, setShowMetaToken] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editLanguage, setEditLanguage] = useState('en');
  const [editUrlError, setEditUrlError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowAgentDropdown(false);
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(e.target as Node)) setShowLanguageDropdown(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visibleAgents = useMemo(() => {
    if (newType === 'internal') return LEADOS_AGENTS.filter(a => !DISCOVERY_AGENT_IDS.includes(a.id));
    return LEADOS_AGENTS;
  }, [newType]);

  const handleTypeChange = (type: 'internal' | 'external') => {
    setNewType(type);
    if (type === 'internal') {
      setSelectedAgents(prev => {
        const next = new Set(prev);
        for (const id of DISCOVERY_AGENT_IDS) next.delete(id);
        return next;
      });
    } else {
      setSelectedAgents(new Set(LEADOS_AGENTS.map(a => a.id)));
    }
  };

  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId); else next.add(agentId);
      return next;
    });
  };

  const selectAllAgents = () => setSelectedAgents(new Set(visibleAgents.map(a => a.id)));
  const deselectAllAgents = () => setSelectedAgents(new Set());

  const isValidUrl = (url: string): boolean => {
    try { const parsed = new URL(url); return parsed.protocol === 'http:' || parsed.protocol === 'https:'; } catch { return false; }
  };

  const handleStep1Continue = () => {
    if (!newName.trim()) return;
    const trimmedUrl = newUrl.trim();
    if (trimmedUrl && !isValidUrl(trimmedUrl)) { setUrlError('Please enter a valid URL (e.g. https://example.com)'); return; }
    setUrlError('');
    setCreateStep(2);
  };

  const resetCreateForm = () => {
    setNewName(''); setNewDescription(''); setNewUrl(''); setNewLanguage('en'); setUrlError(''); setNewType('internal');
    setSelectedAgents(new Set(LEADOS_AGENTS.filter(a => !DISCOVERY_AGENT_IDS.includes(a.id)).map(a => a.id)));
    setMetaAppId(''); setMetaAppSecret(''); setMetaAccessToken(''); setMetaAdAccountId('');
    setShowMetaSecret(false); setShowMetaToken(false);
    setCreateStep(1);
  };

  const handleCreate = async (skipMeta = false) => {
    if (!newName.trim()) return;
    const trimmedUrl = newUrl.trim();
    setUrlError('');

    const metaAdConfig: MetaAdConfig | undefined = (!skipMeta && (metaAppId || metaAppSecret || metaAccessToken || metaAdAccountId))
      ? { appId: metaAppId.trim() || undefined, appSecret: metaAppSecret.trim() || undefined, accessToken: metaAccessToken.trim() || undefined, adAccountId: metaAdAccountId.trim() || undefined }
      : undefined;

    try {
      await createProjectAsync({ name: newName.trim(), description: newDescription.trim() || undefined, url: trimmedUrl || undefined, language: newLanguage, type: newType, enabledAgentIds: [...selectedAgents], metaAdConfig });
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('url')) { setUrlError(msg); setCreateStep(1); }
      return;
    }
    resetCreateForm();
    setShowCreate(false);
  };

  const openEdit = (project: Project) => {
    setEditProject(project); setEditName(project.name); setEditDescription(project.description || '');
    setEditUrl(project.url || (project.config as any)?.url || ''); setEditLanguage(project.language || 'en'); setEditUrlError('');
  };

  const handleEditSave = async () => {
    if (!editProject || !editName.trim()) return;
    const trimmedUrl = editUrl.trim();
    if (trimmedUrl && !isValidUrl(trimmedUrl)) { setEditUrlError('Please enter a valid URL (e.g. https://example.com)'); return; }
    setEditUrlError(''); setEditSaving(true);
    if (trimmedUrl) {
      try {
        const res = await apiFetch('/api/projects/validate-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: trimmedUrl }) });
        if (!res.ok) { const data = await res.json(); setEditUrlError(data.error || 'URL not reachable'); setEditSaving(false); return; }
      } catch { setEditUrlError('URL not reachable. Please check and try again.'); setEditSaving(false); return; }
    }
    updateProject(editProject.id, { name: editName.trim(), description: editDescription.trim() || undefined, url: trimmedUrl || undefined, language: editLanguage });
    setEditSaving(false); setEditProject(null);
  };

  const handleLaunch = (project: Project) => { selectProject(project.id); router.push('/leados'); };

  const getEnabledAgentCount = (project: Project) => {
    if (project.config?.enabledAgentIds) return project.config.enabledAgentIds.length;
    if (project.type === 'internal') return LEADOS_AGENTS.length - DISCOVERY_AGENT_IDS.length;
    return LEADOS_AGENTS.length;
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* ══════ HEADER ══════ */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="mono-ui text-[9px] text-cyan-400/60 mb-2 flex items-center gap-2">
            <span className="w-4 h-px bg-cyan-500/30" />Mission Registry
          </div>
          <h1 className="font-cinzel text-2xl md:text-3xl text-white">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Configure missions. Select agents. Launch pipelines.</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreate(true)}
          className="group flex items-center gap-2.5 rounded-xl px-5 py-3 text-sm font-medium text-cyan-400 transition-all"
          style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.08), rgba(139,92,246,0.05))', border: '1px solid rgba(0,242,255,0.2)' }}>
          <Plus className="h-4 w-4" /> New Project
          <Sparkles className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-violet-400" />
        </motion.button>
      </motion.div>

      {/* ══════ CREATE MODAL ══════ */}
      <AnimatePresence>
      {showCreate && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={() => { resetCreateForm(); setShowCreate(false); }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.25 }}
            className="relative mx-4 w-full max-w-2xl rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'rgba(2,2,5,0.95)', border: '1px solid rgba(0,242,255,0.08)', backdropFilter: 'blur(20px)' }}
            onClick={(e) => e.stopPropagation()}>

            {/* Decorative wave */}
            <svg className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none opacity-10 rounded-b-2xl" preserveAspectRatio="none" viewBox="0 0 100 40">
              <path fill="rgba(0,242,255,0.3)" d="M0,28 Q20,15 40,25 T80,20 T100,28 V40 H0 Z">
                <animate attributeName="d" dur="8s" repeatCount="indefinite"
                  values="M0,28 Q20,15 40,25 T80,20 T100,28 V40 H0 Z;M0,22 Q25,32 50,18 T85,26 T100,22 V40 H0 Z;M0,28 Q20,15 40,25 T80,20 T100,28 V40 H0 Z" />
              </path>
            </svg>

            {/* Step indicator */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                <div className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  createStep === 1 ? 'bg-cyan-500 text-white' : 'bg-cyan-500/20 text-cyan-400')}>1</div>
                <span className={cn('text-xs transition-colors', createStep === 1 ? 'text-white' : 'text-gray-500')}>Mission Details</span>
              </div>
              <div className="h-px w-8 bg-gray-700" />
              <div className="flex items-center gap-2">
                <div className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  createStep === 2 ? 'bg-cyan-500 text-white' : 'bg-white/5 text-gray-600')}>2</div>
                <span className={cn('text-xs transition-colors', createStep === 2 ? 'text-white' : 'text-gray-500')}>Ad Platforms</span>
              </div>
              <div className="ml-auto">
                <button onClick={() => { resetCreateForm(); setShowCreate(false); }} className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative" style={{ zIndex: 1 }}>
              <AnimatePresence mode="wait">
              {/* ── STEP 1: Mission Details ── */}
              {createStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <div className="flex items-center gap-2 mb-5">
                    <Rocket className="h-5 w-5 text-cyan-400" />
                    <h3 className="text-lg font-medium text-white">Create New Mission</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">Project Name</label>
                        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                          placeholder="e.g., AI SaaS Lead Gen" autoFocus
                          className="w-full rounded-xl px-4 py-2.5 text-sm cosmic-input" />
                      </div>
                      <div>
                        <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">Description</label>
                        <input type="text" value={newDescription} onChange={(e) => setNewDescription(e.target.value)}
                          placeholder="Brief description (optional)"
                          className="w-full rounded-xl px-4 py-2.5 text-sm cosmic-input" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">URL</label>
                        <div className="relative">
                          <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                          <input type="url" value={newUrl} onChange={(e) => { setNewUrl(e.target.value); setUrlError(''); }}
                            placeholder="https://example.com"
                            className={cn("w-full rounded-xl pl-10 pr-4 py-2.5 text-sm cosmic-input", urlError && "!border-red-500")} />
                        </div>
                        {urlError && <p className="mt-1 text-xs text-red-400">{urlError}</p>}
                      </div>

                      {/* Agent dropdown */}
                      <div className="relative" ref={dropdownRef}>
                        <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">Agents</label>
                        <button type="button" onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                          className={cn('flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-all w-full',
                            showAgentDropdown ? 'text-white' : 'text-gray-300')}
                          style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${showAgentDropdown ? 'rgba(0,242,255,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                          <Bot className="h-4 w-4 text-cyan-400 shrink-0" />
                          <span className="flex-1 text-left truncate">
                            {selectedAgents.size === visibleAgents.length ? 'All agents selected'
                              : selectedAgents.size === 0 ? 'No agents selected'
                              : `${selectedAgents.size} of ${visibleAgents.length} agents`}
                          </span>
                          <ChevronDown className={cn('h-4 w-4 text-gray-500 transition-transform', showAgentDropdown && 'rotate-180')} />
                        </button>

                        {showAgentDropdown && (
                          <div className="absolute right-0 z-50 mt-1 w-[340px] rounded-xl shadow-2xl overflow-hidden"
                            style={{ background: 'rgba(2,2,5,0.97)', border: '1px solid rgba(0,242,255,0.1)', backdropFilter: 'blur(20px)' }}>
                            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <span className="mono-ui text-[8px] text-gray-500">{selectedAgents.size} selected</span>
                              <div className="flex gap-2">
                                <button onClick={selectAllAgents} className="text-[10px] font-medium text-cyan-400 hover:text-cyan-300">Select All</button>
                                <span className="text-gray-700">|</span>
                                <button onClick={deselectAllAgents} className="text-[10px] font-medium text-gray-500 hover:text-gray-400">Clear</button>
                              </div>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto py-1">
                              {visibleAgents.map((agent) => {
                                const isSelected = selectedAgents.has(agent.id);
                                return (
                                  <button key={agent.id} onClick={() => toggleAgentSelection(agent.id)}
                                    className={cn('flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-white/5', isSelected && 'bg-cyan-500/5')}>
                                    <div className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                                      isSelected ? 'border-cyan-500 bg-cyan-600' : 'border-gray-700 bg-white/5')}>
                                      {isSelected && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <span className={cn('text-xs', isSelected ? 'text-gray-200' : 'text-gray-400')}>{agent.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Language selector */}
                    <div className="relative" ref={languageDropdownRef}>
                      <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">Language</label>
                      <button type="button" onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                        className={cn('flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-all w-full md:w-1/2',
                          showLanguageDropdown ? 'text-white' : 'text-gray-300')}
                        style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${showLanguageDropdown ? 'rgba(0,242,255,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                        <Languages className="h-4 w-4 text-cyan-400 shrink-0" />
                        <span className="flex-1 text-left truncate">
                          {SUPPORTED_LANGUAGES.find(l => l.code === newLanguage)?.label || 'English'}
                        </span>
                        <ChevronDown className={cn('h-4 w-4 text-gray-500 transition-transform', showLanguageDropdown && 'rotate-180')} />
                      </button>

                      {showLanguageDropdown && (
                        <div className="absolute z-50 mt-1 w-full md:w-1/2 rounded-xl shadow-2xl overflow-hidden"
                          style={{ background: 'rgba(2,2,5,0.97)', border: '1px solid rgba(0,242,255,0.1)', backdropFilter: 'blur(20px)' }}>
                          <div className="max-h-[250px] overflow-y-auto py-1">
                            {SUPPORTED_LANGUAGES.map((lang) => {
                              const isSelected = newLanguage === lang.code;
                              return (
                                <button key={lang.code}
                                  onClick={() => { setNewLanguage(lang.code); setShowLanguageDropdown(false); }}
                                  className={cn('flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-white/5', isSelected && 'bg-cyan-500/5')}>
                                  <div className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                                    isSelected ? 'border-cyan-500 bg-cyan-600' : 'border-gray-700 bg-white/5')}>
                                    {isSelected && <Check className="h-3 w-3 text-white" />}
                                  </div>
                                  <span className={cn('text-xs', isSelected ? 'text-gray-200' : 'text-gray-400')}>{lang.label}</span>
                                  <span className="text-[10px] text-gray-600 ml-auto">{lang.code.toUpperCase()}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Type selector */}
                    <div>
                      <label className="mono-ui text-[8px] text-gray-500 block mb-2">Mission Type</label>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { type: 'internal' as const, icon: Building2, color: '#f59e0b', label: 'Internal', desc: 'Skips discovery. Use for existing offers.', agents: '9 agents' },
                          { type: 'external' as const, icon: Globe, color: '#00f2ff', label: 'External', desc: 'Full pipeline with all 13 agents.', agents: '13 agents' },
                        ].map(opt => {
                          const Icon = opt.icon;
                          const isActive = newType === opt.type;
                          return (
                            <motion.button key={opt.type} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                              onClick={() => handleTypeChange(opt.type)}
                              className="relative rounded-xl p-5 text-left transition-all duration-300 overflow-hidden group"
                              style={{
                                background: isActive ? `linear-gradient(135deg, ${opt.color}08, transparent)` : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${isActive ? `${opt.color}40` : 'rgba(255,255,255,0.04)'}`,
                              }}>
                              {isActive && <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blob-morph opacity-30"
                                style={{ background: `radial-gradient(circle, ${opt.color}25, transparent 70%)` }} />}
                              <div className="relative">
                                <div className="relative w-10 h-10 mb-3">
                                  {isActive && (
                                    <div className="absolute inset-0 rounded-full orbit-rotate opacity-60" style={{ border: `1px solid ${opt.color}30` }}>
                                      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ background: opt.color }} />
                                    </div>
                                  )}
                                  <div className="absolute inset-1 rounded-full flex items-center justify-center"
                                    style={{ background: `${opt.color}${isActive ? '15' : '08'}` }}>
                                    <Icon className="h-4 w-4" style={{ color: isActive ? opt.color : '#6b7280' }} />
                                  </div>
                                </div>
                                <p className="text-sm font-medium mb-0.5" style={{ color: isActive ? opt.color : '#9ca3af' }}>{opt.label}</p>
                                <p className="text-[11px] text-gray-600 leading-relaxed">{opt.desc}</p>
                                <p className="mono-ui text-[7px] mt-2" style={{ color: `${opt.color}${isActive ? '80' : '40'}` }}>{opt.agents}</p>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button onClick={() => { resetCreateForm(); setShowCreate(false); }}
                        className="flex-1 rounded-xl px-4 py-2.5 text-sm text-gray-400 transition-colors hover:text-white"
                        style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                        Cancel
                      </button>
                      <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                        onClick={handleStep1Continue} disabled={!newName.trim() || !!urlError}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-cyan-400 transition-all disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.1), rgba(139,92,246,0.05))', border: '1px solid rgba(0,242,255,0.25)' }}>
                        Continue <ChevronRight className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 2: Meta Ad Platform Keys ── */}
              {createStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)' }}>
                      <Megaphone className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-medium text-white">Ad Platforms</h3>
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-orange-400"
                          style={{ background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)' }}>Optional</span>
                      </div>
                      <p className="text-xs text-gray-500">Connect to auto-deploy campaigns</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 mb-6">
                    Connect ad platforms to auto-deploy campaigns after the pipeline completes. You can skip this and do it later.
                  </p>

                  {/* Meta Ads Section */}
                  <div className="rounded-xl p-5 mb-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <h4 className="mono-ui text-[9px] text-orange-400 font-semibold mb-4 tracking-wider">META ADS</h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">App ID</label>
                          <div className="relative">
                            <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                            <input type="text" value={metaAppId} onChange={(e) => setMetaAppId(e.target.value)}
                              placeholder="123456789..."
                              className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm cosmic-input" />
                          </div>
                        </div>
                        <div>
                          <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">App Secret</label>
                          <div className="relative">
                            <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                            <input type={showMetaSecret ? 'text' : 'password'} value={metaAppSecret} onChange={(e) => setMetaAppSecret(e.target.value)}
                              placeholder="abc123def456..."
                              className="w-full rounded-xl pl-10 pr-10 py-2.5 text-sm cosmic-input" />
                            <button type="button" onClick={() => setShowMetaSecret(!showMetaSecret)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                              {showMetaSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">Access Token</label>
                          <div className="relative">
                            <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                            <input type={showMetaToken ? 'text' : 'password'} value={metaAccessToken} onChange={(e) => setMetaAccessToken(e.target.value)}
                              placeholder="EAABsbCS1..."
                              className="w-full rounded-xl pl-10 pr-10 py-2.5 text-sm cosmic-input" />
                            <button type="button" onClick={() => setShowMetaToken(!showMetaToken)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                              {showMetaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">Ad Account ID</label>
                          <div className="relative">
                            <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                            <input type="text" value={metaAdAccountId} onChange={(e) => setMetaAdAccountId(e.target.value)}
                              placeholder="act_123..."
                              className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm cosmic-input" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setCreateStep(1)}
                      className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm text-gray-400 transition-colors hover:text-white"
                      style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                      <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Back
                    </button>
                    <button onClick={() => handleCreate(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm text-gray-400 transition-colors hover:text-white"
                      style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                      <SkipForward className="h-3.5 w-3.5" /> Skip
                    </button>
                    <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      onClick={() => handleCreate(false)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
                      style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(0,242,255,0.08))', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}>
                      <Zap className="h-3.5 w-3.5" /> Create Mission
                    </motion.button>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ══════ EMPTY STATE ══════ */}
      {projects.length === 0 && !showCreate && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="relative rounded-2xl p-16 text-center overflow-hidden"
          style={{ background: 'rgba(2,2,5,0.5)', border: '1px solid rgba(255,255,255,0.03)' }}>
          {/* Decorative orbits */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 pointer-events-none opacity-20">
            <div className="absolute inset-0 rounded-full orbit-rotate" style={{ border: '2px solid rgba(0,242,255,0.15)' }}>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-400/50" />
            </div>
            <div className="absolute inset-8 rounded-full orbit-rotate-reverse" style={{ border: '1px dashed rgba(139,92,246,0.15)' }} />
          </div>
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'rgba(0,242,255,0.05)', border: '1px solid rgba(0,242,255,0.1)' }}>
              <Rocket className="h-7 w-7 text-cyan-400/60" />
            </div>
            <h3 className="font-cinzel text-xl text-white mb-2">No Missions Yet</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Create your first project to organize pipeline runs and customize which agents to deploy.
            </p>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-cyan-400 group"
              style={{ background: 'rgba(0,242,255,0.08)', border: '1px solid rgba(0,242,255,0.2)' }}>
              <Plus className="h-4 w-4" /> Create First Mission
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* ══════ PROJECT GRID ══════ */}
      {projects.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={stagger}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, idx) => {
            const isInternal = project.type === 'internal';
            const accent = isInternal ? '#f59e0b' : '#00f2ff';
            const agentCount = getEnabledAgentCount(project);
            const agentProgress = agentCount / LEADOS_AGENTS.length;
            return (
              <motion.div key={project.id} variants={fadeUp}
                whileHover={{ y: -6, rotateX: 1, rotateY: -1, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } }}
                className="group relative overflow-hidden"
                style={{ perspective: '1000px' }}>

                {/* Animated SVG dashed border */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2 }} preserveAspectRatio="none">
                  <rect x="0.5" y="0.5" width="calc(100% - 1px)" height="calc(100% - 1px)" rx="20" ry="20"
                    fill="none" stroke={`${accent}20`} strokeWidth="1" strokeDasharray="8 6" className="border-flow-animate" />
                </svg>

                <div className="relative rounded-[20px] p-6 overflow-hidden transition-all duration-700"
                  style={{ background: 'rgba(2,2,5,0.5)', border: '1px solid rgba(255,255,255,0.03)' }}>

                  {/* Morphing blob */}
                  <div className="absolute -top-10 -right-10 w-36 h-36 blob-morph opacity-20 group-hover:opacity-40 transition-opacity duration-1000"
                    style={{ background: `radial-gradient(circle, ${accent}20, transparent 70%)`, animationDelay: `${idx * 0.5}s` }} />

                  {/* Wavy bottom */}
                  <svg className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none opacity-15 group-hover:opacity-30 transition-opacity duration-700" preserveAspectRatio="none" viewBox="0 0 100 40">
                    <path fill={`${accent}20`} d="M0,28 Q20,18 40,26 T80,22 T100,28 V40 H0 Z">
                      <animate attributeName="d" dur="7s" repeatCount="indefinite"
                        values="M0,28 Q20,18 40,26 T80,22 T100,28 V40 H0 Z;M0,24 Q25,30 50,20 T85,26 T100,24 V40 H0 Z;M0,28 Q20,18 40,26 T80,22 T100,28 V40 H0 Z" />
                    </path>
                  </svg>

                  {/* Aurora top line */}
                  <div className="absolute top-0 left-0 right-0 h-[1px] aurora-bg"
                    style={{ background: `linear-gradient(90deg, transparent, ${accent}00, ${accent}30, ${accent}00, transparent)`, backgroundSize: '300% 100%' }} />

                  <div className="relative" style={{ zIndex: 3 }}>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* Orbital type icon */}
                        <div className="relative w-11 h-11">
                          <div className="absolute inset-0 rounded-full orbit-rotate opacity-40 group-hover:opacity-70 transition-opacity"
                            style={{ border: `1.5px solid ${accent}25` }}>
                            <div className="absolute -top-[2px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 4px ${accent}` }} />
                          </div>
                          <div className="absolute inset-1.5 rounded-full flex items-center justify-center" style={{ background: `${accent}10` }}>
                            {isInternal ? <Building2 className="h-4 w-4" style={{ color: accent }} /> : <Globe className="h-4 w-4" style={{ color: accent }} />}
                          </div>
                        </div>
                        <span className="rounded-full px-2.5 py-0.5 mono-ui text-[7px]"
                          style={{ color: accent, background: `${accent}10`, border: `1px solid ${accent}20` }}>
                          {project.type}
                        </span>
                        {project.language && (
                          <span className="rounded-full px-2 py-0.5 mono-ui text-[7px] flex items-center gap-1"
                            style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
                            <Languages className="h-2.5 w-2.5" />
                            {(SUPPORTED_LANGUAGES.find(l => l.code === project.language)?.label) || project.language.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(project)} className="rounded-lg p-1.5 text-gray-600 hover:text-cyan-400 hover:bg-white/5 transition-colors" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(project.id)} className="rounded-lg p-1.5 text-gray-600 hover:text-red-400 hover:bg-white/5 transition-colors" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Name + Description */}
                    <h3 className="text-base font-semibold text-white mb-1 group-hover:text-cyan-100 transition-colors">{project.name}</h3>
                    {project.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{project.description}</p>}

                    {/* URL */}
                    {project.url && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <Link2 className="h-3 w-3 text-gray-600 shrink-0" />
                        <a href={project.url} target="_blank" rel="noopener noreferrer"
                          className="text-[11px] text-cyan-400/70 hover:text-cyan-400 truncate transition-colors" title={project.url}>
                          {project.url}
                        </a>
                      </div>
                    )}

                    {/* Agent progress ring */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="relative w-8 h-8 shrink-0">
                        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2.5" />
                          <circle cx="18" cy="18" r="14" fill="none" strokeWidth="2.5" strokeLinecap="round"
                            stroke={accent} strokeDasharray={`${agentProgress * 88} 88`}
                            style={{ filter: `drop-shadow(0 0 3px ${accent}40)`, transition: 'stroke-dasharray 0.5s ease' }} />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Bot className="h-3 w-3" style={{ color: `${accent}80` }} />
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500">{agentCount} of {LEADOS_AGENTS.length} agents</p>
                    </div>

                    {/* Launch button */}
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => handleLaunch(project)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm transition-all group/btn"
                      style={{ background: `${accent}08`, border: `1px solid ${accent}15` }}>
                      <Zap className="h-3.5 w-3.5" style={{ color: accent }} />
                      <span style={{ color: accent }}>Launch Pipeline</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" style={{ color: accent }} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ══════ EDIT MODAL ══════ */}
      <AnimatePresence>
      {editProject && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={() => setEditProject(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.25 }}
            className="mx-4 w-full max-w-lg rounded-2xl p-6 shadow-2xl"
            style={{ background: 'rgba(2,2,5,0.95)', border: '1px solid rgba(0,242,255,0.08)', backdropFilter: 'blur(20px)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-cinzel text-lg text-white">Edit Mission</h3>
              <button onClick={() => setEditProject(null)} className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded-xl px-4 py-2.5 text-sm cosmic-input" />
              </div>
              <div>
                <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">Description</label>
                <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Brief description (optional)"
                  className="w-full rounded-xl px-4 py-2.5 text-sm cosmic-input" />
              </div>
              <div>
                <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">URL</label>
                <div className="relative">
                  <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                  <input type="url" value={editUrl} onChange={(e) => { setEditUrl(e.target.value); setEditUrlError(''); }}
                    placeholder="https://example.com" className={cn("w-full rounded-xl pl-10 pr-4 py-2.5 text-sm cosmic-input", editUrlError && "!border-red-500")} />
                </div>
                {editUrlError && <p className="mt-1 text-xs text-red-400">{editUrlError}</p>}
              </div>
              <div>
                <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">Language</label>
                <select
                  value={editLanguage}
                  onChange={(e) => setEditLanguage(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm cosmic-input appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code} className="bg-[#0a0a0f] text-gray-200">
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">Type</label>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  {editProject.type === 'internal'
                    ? <><Building2 className="h-4 w-4 text-amber-400" /> Internal</>
                    : <><Globe className="h-4 w-4 text-cyan-400" /> External</>}
                  <span className="text-[10px] text-gray-600 ml-2">(cannot be changed)</span>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditProject(null)}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}>Cancel</button>
                <motion.button whileTap={{ scale: 0.98 }} onClick={handleEditSave}
                  disabled={!editName.trim() || !!editUrlError || editSaving}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-cyan-400 transition-all disabled:opacity-40"
                  style={{ background: 'rgba(0,242,255,0.1)', border: '1px solid rgba(0,242,255,0.25)' }}>
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ══════ DELETE MODAL ══════ */}
      <AnimatePresence>
      {deleteConfirm && (() => {
        const project = projects.find((p) => p.id === deleteConfirm);
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.25 }}
              className="mx-4 w-full max-w-md rounded-2xl p-6 shadow-2xl"
              style={{ background: 'rgba(2,2,5,0.95)', border: '1px solid rgba(239,68,68,0.15)', backdropFilter: 'blur(20px)' }}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Delete Mission</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone.</p>
                </div>
              </div>
              <p className="mb-6 text-sm text-gray-300">
                Are you sure you want to delete <span className="font-semibold text-white">{project?.name}</span>? All configuration will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm text-gray-300 transition-colors hover:text-white"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}>Cancel</button>
                <motion.button whileTap={{ scale: 0.98 }}
                  onClick={() => { removeProject(deleteConfirm); setDeleteConfirm(null); }}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:text-white"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  Delete Mission
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        );
      })()}
      </AnimatePresence>
    </div>
  );
}
