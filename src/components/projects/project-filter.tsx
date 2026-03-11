'use client';

import { Building2, Globe, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface ProjectFilterProps {
  className?: string;
}

export function ProjectFilter({ className }: ProjectFilterProps) {
  const { projects, selectedProjectId, selectProject, loadProjects } = useAppStore();

  // Load projects if not loaded
  if (projects.length === 0) {
    try { loadProjects(); } catch {}
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <FolderOpen className="h-4 w-4 text-zinc-500" />
      <select
        value={selectedProjectId || ''}
        onChange={(e) => selectProject(e.target.value || null)}
        className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-3 pr-8 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none"
      >
        <option value="">All Projects</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.type === 'internal' ? '🏢 ' : '🌐 '}{project.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ProjectFilterBadge() {
  const { projects, selectedProjectId } = useAppStore();
  const project = projects.find((p) => p.id === selectedProjectId);

  if (!project) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-1.5">
      {project.type === 'internal' ? (
        <Building2 className="h-4 w-4 text-amber-400" />
      ) : (
        <Globe className="h-4 w-4 text-indigo-400" />
      )}
      <span className="text-sm text-zinc-300">{project.name}</span>
      <span className={cn(
        'rounded-full px-2 py-0.5 text-xs',
        project.type === 'internal' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'
      )}>
        {project.type}
      </span>
    </div>
  );
}
