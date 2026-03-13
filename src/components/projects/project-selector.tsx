'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { FolderOpen, Plus, Building2, Globe, ChevronDown, X, Link2, Bot, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LEADOS_AGENTS, DISCOVERY_AGENT_IDS } from '@/lib/store';
import type { Project } from '@/lib/store';

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onCreateProject: (data: { name: string; description?: string; url?: string; type: 'internal' | 'external'; enabledAgentIds?: string[] }) => void;
}

export function ProjectSelector({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<'internal' | 'external'>('internal');
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(
    new Set(LEADOS_AGENTS.filter(a => !DISCOVERY_AGENT_IDS.includes(a.id)).map(a => a.id))
  );
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const agentDropdownRef = useRef<HTMLDivElement>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Agents visible based on project type
  const visibleAgents = useMemo(() => {
    if (newType === 'internal') {
      return LEADOS_AGENTS.filter(a => !DISCOVERY_AGENT_IDS.includes(a.id));
    }
    return LEADOS_AGENTS;
  }, [newType]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
        setShowAgentDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close agent dropdown on outside click (within the main dropdown)
  useEffect(() => {
    if (!showAgentDropdown) return;
    function handleClick(e: MouseEvent) {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target as Node)) {
        setShowAgentDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showAgentDropdown]);

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

  const isUrlValid = (url: string) => {
    if (!url.trim()) return false;
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const canCreate = newName.trim() && (newType === 'internal' || isUrlValid(newUrl));

  const handleCreate = () => {
    if (!canCreate) return;
    onCreateProject({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      url: newUrl.trim() || undefined,
      type: newType,
      enabledAgentIds: [...selectedAgents],
    });
    setNewName('');
    setNewDescription('');
    setNewUrl('');
    setNewType('internal');
    setSelectedAgents(new Set(LEADOS_AGENTS.filter(a => !DISCOVERY_AGENT_IDS.includes(a.id)).map(a => a.id)));
    setShowCreateForm(false);
    setShowAgentDropdown(false);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Compact trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors',
          selectedProject
            ? 'border-indigo-500/30 bg-indigo-500/5 text-white'
            : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
        )}
      >
        {selectedProject ? (
          <>
            {selectedProject.type === 'internal' ? (
              <Building2 className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Globe className="h-3.5 w-3.5 text-indigo-400" />
            )}
            <span className="max-w-[160px] truncate text-xs font-medium">{selectedProject.name}</span>
          </>
        ) : (
          <>
            <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs text-amber-400">Select Project</span>
          </>
        )}
        <ChevronDown className={cn('h-3 w-3 text-zinc-500 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-80 rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50">
          <div className="max-h-64 overflow-y-auto">
            {/* No project option — runs on existing DB leads */}
            <button
              onClick={() => { onSelectProject(null); setIsOpen(false); }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-zinc-800',
                !selectedProjectId && 'bg-zinc-800'
              )}
            >
              <FolderOpen className="h-4 w-4 text-zinc-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-300">No project — use existing leads</p>
                <p className="text-[10px] text-zinc-600">Agents work on leads already in the database</p>
              </div>
            </button>

            {projects.length > 0 && <div className="border-t border-zinc-800" />}

            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => { onSelectProject(project.id); setIsOpen(false); }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-zinc-800',
                  selectedProjectId === project.id && 'bg-zinc-800'
                )}
              >
                {project.type === 'internal' ? (
                  <Building2 className="h-4 w-4 text-amber-400 shrink-0" />
                ) : (
                  <Globe className="h-4 w-4 text-indigo-400 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-300 truncate">{project.name}</p>
                  <p className="text-[10px] text-zinc-600 truncate">
                    {project.type === 'internal' ? 'Internal — skips discovery' : 'External — full pipeline'}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-zinc-800" />

          {/* Create new project */}
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-indigo-400 transition-colors hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" />
              <span className="text-xs font-medium">New project</span>
            </button>
          ) : (
            <div className="p-3 space-y-2">
              {/* Project name */}
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && canCreate && handleCreate()}
              />

              {/* Description */}
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />

              {/* URL field — required for external projects */}
              <div className="relative">
                <Link2 className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3", newType === 'external' && !newUrl.trim() ? 'text-red-400' : 'text-zinc-500')} />
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder={newType === 'external' ? 'https://client-website.com (required)' : 'https://example.com (optional)'}
                  className={cn(
                    "w-full rounded-lg border bg-zinc-800 pl-7 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none",
                    newType === 'external' && newUrl.trim() && !isUrlValid(newUrl)
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-zinc-700 focus:border-indigo-500'
                  )}
                />
              </div>

              {/* Agent selector dropdown */}
              <div className="relative" ref={agentDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                    showAgentDropdown
                      ? 'border-indigo-500 bg-zinc-800 text-white'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600'
                  )}
                >
                  <Bot className="h-3 w-3 text-indigo-400 shrink-0" />
                  <span className="flex-1 text-left truncate">
                    {selectedAgents.size === visibleAgents.length
                      ? 'All agents selected'
                      : selectedAgents.size === 0
                      ? 'No agents selected'
                      : `${selectedAgents.size} of ${visibleAgents.length} agents`}
                  </span>
                  <ChevronDown className={cn('h-3 w-3 text-zinc-500 transition-transform', showAgentDropdown && 'rotate-180')} />
                </button>

                {/* Agent dropdown panel */}
                {showAgentDropdown && (
                  <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
                    {/* Select all / none */}
                    <div className="flex items-center justify-between border-b border-zinc-800 px-2.5 py-1.5">
                      <span className="text-[10px] text-zinc-400">{selectedAgents.size} selected</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedAgents(new Set(visibleAgents.map(a => a.id)))}
                          className="text-[10px] font-medium text-indigo-400 hover:text-indigo-300"
                        >
                          All
                        </button>
                        <span className="text-zinc-700">|</span>
                        <button
                          onClick={() => setSelectedAgents(new Set())}
                          className="text-[10px] font-medium text-zinc-500 hover:text-zinc-400"
                        >
                          None
                        </button>
                      </div>
                    </div>

                    {/* Agent list */}
                    <div className="max-h-[200px] overflow-y-auto py-0.5">
                      {visibleAgents.map((agent) => {
                        const isSelected = selectedAgents.has(agent.id);
                        return (
                          <button
                            key={agent.id}
                            onClick={() => toggleAgentSelection(agent.id)}
                            className={cn(
                              'flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-zinc-800',
                              isSelected && 'bg-indigo-950/20'
                            )}
                          >
                            <div
                              className={cn(
                                'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors',
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-600'
                                  : 'border-zinc-600 bg-zinc-800'
                              )}
                            >
                              {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                            </div>
                            <span className={cn('text-[11px]', isSelected ? 'text-zinc-200' : 'text-zinc-400')}>
                              {agent.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Type selector */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleTypeChange('internal')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-colors',
                    newType === 'internal'
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                      : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'
                  )}
                >
                  <Building2 className="h-3 w-3" />
                  Internal
                </button>
                <button
                  onClick={() => handleTypeChange('external')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-colors',
                    newType === 'external'
                      ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                      : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'
                  )}
                >
                  <Globe className="h-3 w-3" />
                  External
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setShowCreateForm(false); setNewName(''); setNewDescription(''); setNewUrl(''); setShowAgentDropdown(false); }}
                  className="flex-1 rounded-lg border border-zinc-700 px-2 py-1.5 text-[10px] text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!canCreate}
                  title={newType === 'external' && !isUrlValid(newUrl) ? 'URL is required for external projects' : undefined}
                  className="flex-1 rounded-lg bg-indigo-600 px-2 py-1.5 text-[10px] font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
