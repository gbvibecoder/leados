'use client';

import { useState, useRef, useEffect } from 'react';
import { FolderOpen, Plus, Building2, Globe, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/store';

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onCreateProject: (data: { name: string; description?: string; type: 'internal' | 'external' }) => void;
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
  const [newType, setNewType] = useState<'internal' | 'external'>('internal');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateProject({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      type: newType,
    });
    setNewName('');
    setNewDescription('');
    setNewType('internal');
    setShowCreateForm(false);
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
            <span className="max-w-[140px] truncate text-xs font-medium">{selectedProject.name}</span>
            <span
              onClick={(e) => { e.stopPropagation(); onSelectProject(null); setIsOpen(false); }}
              className="rounded p-0.5 hover:bg-zinc-700"
            >
              <X className="h-3 w-3 text-zinc-500" />
            </span>
          </>
        ) : (
          <>
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="text-xs">All Projects</span>
          </>
        )}
        <ChevronDown className={cn('h-3 w-3 text-zinc-500 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-72 rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50">
          <div className="max-h-64 overflow-y-auto">
            {/* No project option */}
            <button
              onClick={() => { onSelectProject(null); setIsOpen(false); }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-zinc-800',
                !selectedProjectId && 'bg-zinc-800'
              )}
            >
              <FolderOpen className="h-4 w-4 text-zinc-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-300">No project (full pipeline)</p>
                <p className="text-[10px] text-zinc-600">Run all 13 agents</p>
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
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={() => setNewType('internal')}
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
                  onClick={() => setNewType('external')}
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
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setShowCreateForm(false); setNewName(''); setNewDescription(''); }}
                  className="flex-1 rounded-lg border border-zinc-700 px-2 py-1.5 text-[10px] text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
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
