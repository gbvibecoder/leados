'use client';

import { useState } from 'react';
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

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

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
    <div className="mb-6">
      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
        Project
      </label>

      <div className="relative">
        {/* Selected project display / dropdown trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
            selectedProject
              ? 'border-indigo-500/30 bg-indigo-500/5'
              : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
          )}
        >
          <div className="flex items-center gap-3">
            {selectedProject ? (
              <>
                {selectedProject.type === 'internal' ? (
                  <Building2 className="h-5 w-5 text-amber-400" />
                ) : (
                  <Globe className="h-5 w-5 text-indigo-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-white">{selectedProject.name}</p>
                  <p className="text-xs text-zinc-400">
                    {selectedProject.type === 'internal' ? 'Internal' : 'External'} project
                    {selectedProject.description && ` — ${selectedProject.description}`}
                  </p>
                </div>
              </>
            ) : (
              <>
                <FolderOpen className="h-5 w-5 text-zinc-500" />
                <div>
                  <p className="text-sm text-zinc-400">No project selected</p>
                  <p className="text-xs text-zinc-600">All 13 agents will run</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedProject && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectProject(null);
                }}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </span>
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-zinc-500 transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
            {/* No project option */}
            <button
              onClick={() => {
                onSelectProject(null);
                setIsOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-800',
                !selectedProjectId && 'bg-zinc-800'
              )}
            >
              <FolderOpen className="h-4 w-4 text-zinc-500" />
              <div>
                <p className="text-sm text-zinc-300">No project (full pipeline)</p>
                <p className="text-xs text-zinc-600">Run all 13 agents</p>
              </div>
            </button>

            {/* Divider */}
            {projects.length > 0 && <div className="border-t border-zinc-800" />}

            {/* Project list */}
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  onSelectProject(project.id);
                  setIsOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-800',
                  selectedProjectId === project.id && 'bg-zinc-800'
                )}
              >
                {project.type === 'internal' ? (
                  <Building2 className="h-4 w-4 text-amber-400" />
                ) : (
                  <Globe className="h-4 w-4 text-indigo-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-300">{project.name}</p>
                  <p className="truncate text-xs text-zinc-600">
                    {project.type === 'internal' ? 'Internal — skips 4 discovery agents' : 'External — full pipeline'}
                    {project.description && ` | ${project.description}`}
                  </p>
                </div>
              </button>
            ))}

            {/* Divider */}
            <div className="border-t border-zinc-800" />

            {/* Create new project */}
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-indigo-400 transition-colors hover:bg-zinc-800"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm">Create new project</span>
              </button>
            ) : (
              <div className="p-4 space-y-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Project name"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  autoFocus
                />
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />

                {/* Type selector */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewType('internal')}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                      newType === 'internal'
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    )}
                  >
                    <Building2 className="h-4 w-4" />
                    Internal
                  </button>
                  <button
                    onClick={() => setNewType('external')}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                      newType === 'external'
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    )}
                  >
                    <Globe className="h-4 w-4" />
                    External
                  </button>
                </div>

                {newType === 'internal' && (
                  <p className="text-xs text-amber-400/70">
                    Skips Service Research, Offer Engineering, Validation, and Funnel Builder agents.
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim()}
                    className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
