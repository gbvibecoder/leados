'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { FolderOpen, Plus, Building2, Globe, ChevronDown, X, Link2, Bot, Check, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LEADOS_AGENTS, DISCOVERY_AGENT_IDS, SUPPORTED_LANGUAGES } from '@/lib/store';
import type { Project } from '@/lib/store';

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onCreateProject: (data: { name: string; description?: string; url?: string; language?: string; type: 'internal' | 'external'; enabledAgentIds?: string[] }) => void;
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
  const [newLanguage, setNewLanguage] = useState('en');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [newType, setNewType] = useState<'internal' | 'external'>('internal');
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(
    new Set(LEADOS_AGENTS.filter(a => !DISCOVERY_AGENT_IDS.includes(a.id)).map(a => a.id))
  );
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const agentDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

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

  // Close language dropdown on outside click
  useEffect(() => {
    if (!showLanguageDropdown) return;
    function handleClick(e: MouseEvent) {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(e.target as Node)) {
        setShowLanguageDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showLanguageDropdown]);

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
      language: newLanguage,
      type: newType,
      enabledAgentIds: [...selectedAgents],
    });
    setNewName('');
    setNewDescription('');
    setNewUrl('');
    setNewLanguage('en');
    setNewType('internal');
    setSelectedAgents(new Set(LEADOS_AGENTS.filter(a => !DISCOVERY_AGENT_IDS.includes(a.id)).map(a => a.id)));
    setShowCreateForm(false);
    setShowAgentDropdown(false);
    setShowLanguageDropdown(false);
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
            ? 'border-cyan-500/30 bg-cyan-500/5 text-white'
            : 'border-white/[0.06] bg-white/[0.02] text-gray-400 hover:border-cyan-500/20'
        )}
      >
        {selectedProject ? (
          <>
            {selectedProject.type === 'internal' ? (
              <Building2 className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Globe className="h-3.5 w-3.5 text-cyan-400" />
            )}
            <span className="max-w-[160px] truncate text-xs font-medium">{selectedProject.name}</span>
          </>
        ) : (
          <>
            <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs text-amber-400">Select Project</span>
          </>
        )}
        <ChevronDown className={cn('h-3 w-3 text-gray-500 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-80 rounded-lg border border-white/[0.08] bg-[#0a0a0f] shadow-2xl shadow-black/60 backdrop-blur-sm">
          <div className="max-h-64 overflow-y-auto">
            {/* No project option — runs on existing DB leads */}
            <button
              onClick={() => { onSelectProject(null); setIsOpen(false); }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/5',
                !selectedProjectId && 'bg-white/5'
              )}
            >
              <FolderOpen className="h-4 w-4 text-gray-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-300">No project — use existing leads</p>
                <p className="text-[10px] text-gray-600">Agents work on leads already in the database</p>
              </div>
            </button>

            {projects.length > 0 && <div className="border-t border-white/[0.04]" />}

            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => { onSelectProject(project.id); setIsOpen(false); }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/5',
                  selectedProjectId === project.id && 'bg-white/5'
                )}
              >
                {project.type === 'internal' ? (
                  <Building2 className="h-4 w-4 text-amber-400 shrink-0" />
                ) : (
                  <Globe className="h-4 w-4 text-cyan-400 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-300 truncate">{project.name}</p>
                  <p className="text-[10px] text-gray-600 truncate">
                    {project.type === 'internal' ? 'Internal — skips discovery' : 'External — full pipeline'}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-white/[0.04]" />

          {/* Create new project */}
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-cyan-400 transition-colors hover:bg-white/5"
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
                className="w-full rounded-lg border border-white/[0.08] bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:border-cyan-400 focus:outline-none"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && canCreate && handleCreate()}
              />

              {/* Description */}
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full rounded-lg border border-white/[0.08] bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:border-cyan-400 focus:outline-none"
              />

              {/* URL field — required for external projects */}
              <div className="relative">
                <Link2 className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3", newType === 'external' && !newUrl.trim() ? 'text-red-400' : 'text-gray-500')} />
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder={newType === 'external' ? 'https://client-website.com (required)' : 'https://example.com (optional)'}
                  className={cn(
                    "w-full rounded-lg border bg-white/5 pl-7 pr-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none",
                    newType === 'external' && newUrl.trim() && !isUrlValid(newUrl)
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-white/[0.08] focus:border-cyan-400'
                  )}
                />
              </div>

              {/* Language selector dropdown */}
              <div className="relative" ref={languageDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                    showLanguageDropdown
                      ? 'border-cyan-500 bg-white/5 text-white'
                      : 'border-white/[0.08] bg-white/5 text-gray-300 hover:border-cyan-500/20'
                  )}
                >
                  <Languages className="h-3 w-3 text-cyan-400 shrink-0" />
                  <span className="flex-1 text-left truncate">
                    {SUPPORTED_LANGUAGES.find(l => l.code === newLanguage)?.label || 'English'}
                  </span>
                  <ChevronDown className={cn('h-3 w-3 text-gray-500 transition-transform', showLanguageDropdown && 'rotate-180')} />
                </button>

                {showLanguageDropdown && (
                  <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-white/[0.06] bg-[#0a0a0f] shadow-xl">
                    <div className="max-h-[200px] overflow-y-auto py-0.5">
                      {SUPPORTED_LANGUAGES.map((lang) => {
                        const isSelected = newLanguage === lang.code;
                        return (
                          <button
                            key={lang.code}
                            onClick={() => { setNewLanguage(lang.code); setShowLanguageDropdown(false); }}
                            className={cn(
                              'flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-white/5',
                              isSelected && 'bg-cyan-950/20'
                            )}
                          >
                            <div
                              className={cn(
                                'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors',
                                isSelected
                                  ? 'border-cyan-500 bg-cyan-600'
                                  : 'border-zinc-600 bg-white/5'
                              )}
                            >
                              {isSelected && <Check className="h-2 w-2 text-white" />}
                            </div>
                            <span className={cn('text-[11px]', isSelected ? 'text-gray-200' : 'text-gray-400')}>
                              {lang.label}
                            </span>
                            <span className="text-[9px] text-gray-600 ml-auto">{lang.code.toUpperCase()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Agent selector dropdown */}
              <div className="relative" ref={agentDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                    showAgentDropdown
                      ? 'border-cyan-500 bg-white/5 text-white'
                      : 'border-white/[0.08] bg-white/5 text-gray-300 hover:border-cyan-500/20'
                  )}
                >
                  <Bot className="h-3 w-3 text-cyan-400 shrink-0" />
                  <span className="flex-1 text-left truncate">
                    {selectedAgents.size === visibleAgents.length
                      ? 'All agents selected'
                      : selectedAgents.size === 0
                      ? 'No agents selected'
                      : `${selectedAgents.size} of ${visibleAgents.length} agents`}
                  </span>
                  <ChevronDown className={cn('h-3 w-3 text-gray-500 transition-transform', showAgentDropdown && 'rotate-180')} />
                </button>

                {/* Agent dropdown panel */}
                {showAgentDropdown && (
                  <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-white/[0.06] bg-white/[0.02] shadow-xl">
                    {/* Select all / none */}
                    <div className="flex items-center justify-between border-b border-white/[0.04] px-2.5 py-1.5">
                      <span className="text-[10px] text-gray-400">{selectedAgents.size} selected</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedAgents(new Set(visibleAgents.map(a => a.id)))}
                          className="text-[10px] font-medium text-cyan-400 hover:text-cyan-300"
                        >
                          All
                        </button>
                        <span className="text-zinc-700">|</span>
                        <button
                          onClick={() => setSelectedAgents(new Set())}
                          className="text-[10px] font-medium text-gray-500 hover:text-gray-400"
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
                              'flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-white/5',
                              isSelected && 'bg-cyan-950/20'
                            )}
                          >
                            <div
                              className={cn(
                                'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors',
                                isSelected
                                  ? 'border-cyan-500 bg-cyan-600'
                                  : 'border-zinc-600 bg-white/5'
                              )}
                            >
                              {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                            </div>
                            <span className={cn('text-[11px]', isSelected ? 'text-gray-200' : 'text-gray-400')}>
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
                      : 'border-white/[0.08] text-gray-500 hover:border-cyan-500/20'
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
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                      : 'border-white/[0.08] text-gray-500 hover:border-cyan-500/20'
                  )}
                >
                  <Globe className="h-3 w-3" />
                  External
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setShowCreateForm(false); setNewName(''); setNewDescription(''); setNewUrl(''); setNewLanguage('en'); setShowAgentDropdown(false); setShowLanguageDropdown(false); }}
                  className="flex-1 rounded-lg border border-white/[0.08] px-2 py-1.5 text-[10px] text-gray-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!canCreate}
                  title={newType === 'external' && !isUrlValid(newUrl) ? 'URL is required for external projects' : undefined}
                  className="flex-1 rounded-lg bg-cyan-600 px-2 py-1.5 text-[10px] font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
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
