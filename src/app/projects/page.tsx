'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Building2, Globe, ArrowRight, Trash2, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, DISCOVERY_AGENT_IDS } from '@/lib/store';
import type { Project } from '@/lib/store';

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, selectProject, createProject, removeProject, loadProjects } = useAppStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<'internal' | 'external'>('internal');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createProject({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      type: newType,
    });
    setNewName('');
    setNewDescription('');
    setNewType('internal');
    setShowCreate(false);
  };

  const handleLaunch = (project: Project) => {
    selectProject(project.id);
    router.push('/leados');
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm text-zinc-400">
            Manage your projects. Internal projects skip the first {DISCOVERY_AGENT_IDS.length} discovery agents.
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
      {showCreate && (
        <div className="mb-6 rounded-lg border border-zinc-700 bg-zinc-900 p-5">
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
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Type</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setNewType('internal')}
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
                  onClick={() => setNewType('external')}
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
                disabled={!newName.trim()}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project list */}
      {projects.length === 0 && !showCreate ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-sm text-zinc-400">No projects yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Create a project to organize your pipeline runs and skip agents for internal projects.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
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
                <button
                  onClick={() => setDeleteConfirm(project.id)}
                  className="rounded p-1 text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-red-400 group-hover:opacity-100"
                  title="Delete project"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <h3 className="mb-1 text-base font-semibold text-white">{project.name}</h3>
              {project.description && (
                <p className="mb-3 text-sm text-zinc-500">{project.description}</p>
              )}

              <p className="mb-4 text-xs text-zinc-600">
                {project.type === 'internal'
                  ? `Runs 9 agents (skips ${DISCOVERY_AGENT_IDS.length} discovery agents)`
                  : 'Runs all 13 agents'}
              </p>

              <button
                onClick={() => handleLaunch(project)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                Launch Pipeline
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (() => {
        const project = projects.find((p) => p.id === deleteConfirm);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
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
            </div>
          </div>
        );
      })()}
    </div>
  );
}
