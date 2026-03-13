'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Building2, Globe, ArrowRight, Trash2, AlertTriangle, X, ChevronDown, Check, Link2, Bot, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, DISCOVERY_AGENT_IDS, LEADOS_AGENTS } from '@/lib/store';
import type { Project } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, selectProject, createProjectAsync, removeProject, updateProject, loadProjects } = useAppStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<'internal' | 'external'>('internal');
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(
    new Set(LEADOS_AGENTS.filter(a => !DISCOVERY_AGENT_IDS.includes(a.id)).map(a => a.id))
  );
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [urlError, setUrlError] = useState('');
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editUrlError, setEditUrlError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAgentDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Agents visible in dropdown based on project type
  const visibleAgents = useMemo(() => {
    if (newType === 'internal') {
      return LEADOS_AGENTS.filter(a => !DISCOVERY_AGENT_IDS.includes(a.id));
    }
    return LEADOS_AGENTS;
  }, [newType]);

  // When switching type, remove discovery agents from selection if going internal
  const handleTypeChange = (type: 'internal' | 'external') => {
    setNewType(type);
    if (type === 'internal') {
      setSelectedAgents(prev => {
        const next = new Set(prev);
        for (const id of DISCOVERY_AGENT_IDS) {
          next.delete(id);
        }
        return next;
      });
    } else {
      // External — select all 13 agents by default
      setSelectedAgents(new Set(LEADOS_AGENTS.map(a => a.id)));
    }
  };

  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  };

  const selectAllAgents = () => {
    setSelectedAgents(new Set(visibleAgents.map(a => a.id)));
  };

  const deselectAllAgents = () => {
    setSelectedAgents(new Set());
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const trimmedUrl = newUrl.trim();
    if (trimmedUrl && !isValidUrl(trimmedUrl)) {
      setUrlError('Please enter a valid URL (e.g. https://example.com)');
      return;
    }
    setUrlError('');
    try {
      await createProjectAsync({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        url: trimmedUrl || undefined,
        type: newType,
        enabledAgentIds: [...selectedAgents],
      });
    } catch (err: any) {
      // Show backend URL validation error
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('url')) {
        setUrlError(msg);
      }
      return;
    }
    setNewName('');
    setNewDescription('');
    setNewUrl('');
    setUrlError('');
    setNewType('internal');
    setSelectedAgents(new Set(LEADOS_AGENTS.filter(a => !DISCOVERY_AGENT_IDS.includes(a.id)).map(a => a.id)));
    setShowCreate(false);
  };

  const openEdit = (project: Project) => {
    setEditProject(project);
    setEditName(project.name);
    setEditDescription(project.description || '');
    setEditUrl(project.url || (project.config as any)?.url || '');
    setEditUrlError('');
  };

  const handleEditSave = async () => {
    if (!editProject || !editName.trim()) return;
    const trimmedUrl = editUrl.trim();
    if (trimmedUrl && !isValidUrl(trimmedUrl)) {
      setEditUrlError('Please enter a valid URL (e.g. https://example.com)');
      return;
    }
    setEditUrlError('');
    setEditSaving(true);

    // Validate URL reachability via backend
    if (trimmedUrl) {
      try {
        const res = await fetch('/api/projects/validate-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmedUrl }),
        });
        if (!res.ok) {
          const data = await res.json();
          setEditUrlError(data.error || 'URL not reachable');
          setEditSaving(false);
          return;
        }
      } catch {
        setEditUrlError('URL not reachable. Please check and try again.');
        setEditSaving(false);
        return;
      }
    }

    updateProject(editProject.id, {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      url: trimmedUrl || undefined,
    });
    setEditSaving(false);
    setEditProject(null);
  };

  const handleLaunch = (project: Project) => {
    selectProject(project.id);
    router.push('/leados');
  };

  const getEnabledAgentCount = (project: Project) => {
    if (project.config?.enabledAgentIds) {
      return project.config.enabledAgentIds.length;
    }
    if (project.type === 'internal') {
      return LEADOS_AGENTS.length - DISCOVERY_AGENT_IDS.length;
    }
    return LEADOS_AGENTS.length;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm text-zinc-400">
            Manage your projects. Select agents to customize which ones run in the pipeline.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
          className="mb-6 overflow-hidden"
        >
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-5">
          <h3 className="mb-4 text-lg font-medium text-white">Create Project</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., AI SaaS Lead Gen"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Description</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description (optional)"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* URL + Agent Selector row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm text-zinc-400">URL</label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => { setNewUrl(e.target.value); setUrlError(''); }}
                    placeholder="https://example.com"
                    className={cn(
                      "w-full rounded-lg border bg-zinc-800 pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none",
                      urlError ? "border-red-500 focus:border-red-500" : "border-zinc-700 focus:border-indigo-500"
                    )}
                  />
                </div>
                {urlError && <p className="mt-1 text-xs text-red-400">{urlError}</p>}
              </div>

              {/* Agent dropdown */}
              <div className="relative" ref={dropdownRef}>
                <label className="mb-1 block text-sm text-zinc-400">Agents</label>
                <button
                  type="button"
                  onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors min-w-[200px]',
                    showAgentDropdown
                      ? 'border-indigo-500 bg-zinc-800 text-white'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600'
                  )}
                >
                  <Bot className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span className="flex-1 text-left truncate">
                    {selectedAgents.size === visibleAgents.length
                      ? 'All agents selected'
                      : selectedAgents.size === 0
                      ? 'No agents selected'
                      : `${selectedAgents.size} of ${visibleAgents.length} agents`}
                  </span>
                  <ChevronDown className={cn('h-4 w-4 text-zinc-500 transition-transform', showAgentDropdown && 'rotate-180')} />
                </button>

                {/* Dropdown panel */}
                {showAgentDropdown && (
                  <div className="absolute right-0 z-50 mt-1 w-[340px] rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
                    {/* Select all / none controls */}
                    <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                      <span className="text-xs text-zinc-400">{selectedAgents.size} selected</span>
                      <div className="flex gap-2">
                        <button
                          onClick={selectAllAgents}
                          className="text-[10px] font-medium text-indigo-400 hover:text-indigo-300"
                        >
                          Select All
                        </button>
                        <span className="text-zinc-700">|</span>
                        <button
                          onClick={deselectAllAgents}
                          className="text-[10px] font-medium text-zinc-500 hover:text-zinc-400"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    {/* Agent list */}
                    <div className="max-h-[300px] overflow-y-auto py-1">
                      {visibleAgents.map((agent) => {
                        const isSelected = selectedAgents.has(agent.id);
                        return (
                          <button
                            key={agent.id}
                            onClick={() => toggleAgentSelection(agent.id)}
                            className={cn(
                              'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-zinc-800',
                              isSelected && 'bg-indigo-950/20'
                            )}
                          >
                            <div
                              className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-600'
                                  : 'border-zinc-600 bg-zinc-800'
                              )}
                            >
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className={cn('text-xs', isSelected ? 'text-zinc-200' : 'text-zinc-400')}>
                              {agent.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-400">Type</label>
              <div className="flex gap-3">
                <button
                  onClick={() => handleTypeChange('internal')}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-2 rounded-lg border p-4 transition-colors',
                    newType === 'internal'
                      ? 'border-amber-500/50 bg-amber-500/10'
                      : 'border-zinc-700 hover:border-zinc-600'
                  )}
                >
                  <Building2 className={cn('h-6 w-6', newType === 'internal' ? 'text-amber-400' : 'text-zinc-500')} />
                  <span className={cn('text-sm font-medium', newType === 'internal' ? 'text-amber-400' : 'text-zinc-400')}>
                    Internal
                  </span>
                  <span className="text-xs text-zinc-500 text-center">
                    Skips discovery agents. Use for projects you already have offers for.
                  </span>
                </button>
                <button
                  onClick={() => handleTypeChange('external')}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-2 rounded-lg border p-4 transition-colors',
                    newType === 'external'
                      ? 'border-indigo-500/50 bg-indigo-500/10'
                      : 'border-zinc-700 hover:border-zinc-600'
                  )}
                >
                  <Globe className={cn('h-6 w-6', newType === 'external' ? 'text-indigo-400' : 'text-zinc-500')} />
                  <span className={cn('text-sm font-medium', newType === 'external' ? 'text-indigo-400' : 'text-zinc-400')}>
                    External
                  </span>
                  <span className="text-xs text-zinc-500 text-center">
                    Full pipeline. Runs all 13 agents including research & validation.
                  </span>
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || !!urlError}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Project list */}
      {projects.length === 0 && !showCreate ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-sm text-zinc-400">No projects yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Create a project to organize your pipeline runs and choose which agents to run.
          </p>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {projects.map((project) => (
            <motion.div
              key={project.id}
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] } } }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className="group rounded-lg border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {project.type === 'internal' ? (
                    <Building2 className="h-5 w-5 text-amber-400" />
                  ) : (
                    <Globe className="h-5 w-5 text-indigo-400" />
                  )}
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      project.type === 'internal'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-indigo-500/10 text-indigo-400'
                    )}
                  >
                    {project.type}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(project)}
                    className="rounded p-1 text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-indigo-400 group-hover:opacity-100"
                    title="Edit project"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(project.id)}
                    className="rounded p-1 text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-red-400 group-hover:opacity-100"
                    title="Delete project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h3 className="mb-1 text-base font-semibold text-white">{project.name}</h3>
              {project.description && (
                <p className="mb-2 text-sm text-zinc-500">{project.description}</p>
              )}

              {project.url && (
                <div className="mb-2 flex items-center gap-1.5">
                  <Link2 className="h-3 w-3 text-zinc-500 shrink-0" />
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 truncate"
                    title={project.url}
                  >
                    {project.url}
                  </a>
                </div>
              )}

              <div className="mb-4 flex items-center gap-2">
                <Bot className="h-3 w-3 text-zinc-500" />
                <p className="text-xs text-zinc-600">
                  {getEnabledAgentCount(project)} of {LEADOS_AGENTS.length} agents enabled
                </p>
              </div>

              <button
                onClick={() => handleLaunch(project)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                Launch Pipeline
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Edit project modal */}
      <AnimatePresence>
      {editProject && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setEditProject(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
            className="mx-4 w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Edit Project</h3>
              <button onClick={() => setEditProject(null)} className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-400">Description</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Brief description (optional)"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-400">URL</label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="url"
                    value={editUrl}
                    onChange={(e) => { setEditUrl(e.target.value); setEditUrlError(''); }}
                    placeholder="https://example.com"
                    className={cn(
                      "w-full rounded-lg border bg-zinc-800 pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none",
                      editUrlError ? "border-red-500 focus:border-red-500" : "border-zinc-700 focus:border-indigo-500"
                    )}
                  />
                </div>
                {editUrlError && <p className="mt-1 text-xs text-red-400">{editUrlError}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-400">Type</label>
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  {editProject.type === 'internal' ? (
                    <><Building2 className="h-4 w-4 text-amber-400" /> Internal</>
                  ) : (
                    <><Globe className="h-4 w-4 text-indigo-400" /> External</>
                  )}
                  <span className="text-xs text-zinc-600 ml-2">(cannot be changed)</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditProject(null)}
                  className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={!editName.trim() || !!editUrlError || editSaving}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
      {deleteConfirm && (() => {
        const project = projects.find((p) => p.id === deleteConfirm);
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
              className="mx-4 w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Delete Project</h3>
                  <p className="text-sm text-zinc-400">This action cannot be undone.</p>
                </div>
              </div>
              <p className="mb-6 text-sm text-zinc-300">
                Are you sure you want to delete <span className="font-semibold text-white">{project?.name}</span>? All project configuration will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    removeProject(deleteConfirm);
                    setDeleteConfirm(null);
                  }}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500 transition-colors"
                >
                  Delete Project
                </button>
              </div>
            </motion.div>
          </motion.div>
        );
      })()}
      </AnimatePresence>
    </div>
  );
}
