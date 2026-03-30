'use client';

import { useState, useEffect, useRef } from 'react';
import { Building2, Globe, FolderOpen, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface ProjectFilterProps {
  className?: string;
}

export function ProjectFilter({ className }: ProjectFilterProps) {
  const { projects, selectedProjectId, selectProject, loadProjects } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Always load projects on mount so the dropdown is populated
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    try { loadProjects(); } catch {}
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {/* Trigger button */}
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
            <FolderOpen className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs">All Projects</span>
          </>
        )}
        <ChevronDown className={cn('h-3 w-3 text-gray-500 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-72 rounded-lg border border-white/[0.08] bg-[#0a0a0f] shadow-2xl shadow-black/60 backdrop-blur-sm">
          <div className="max-h-64 overflow-y-auto">
            {/* All projects option */}
            <button
              onClick={() => { selectProject(null); setIsOpen(false); }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/5',
                !selectedProjectId && 'bg-white/5'
              )}
            >
              <FolderOpen className="h-4 w-4 text-gray-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-300">All Projects</p>
                <p className="text-[10px] text-gray-600">Show leads from all projects</p>
              </div>
            </button>

            {projects.length > 0 && <div className="border-t border-white/[0.04]" />}

            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => { selectProject(project.id); setIsOpen(false); }}
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
        </div>
      )}
    </div>
  );
}

export function ProjectFilterBadge() {
  const { projects, selectedProjectId } = useAppStore();
  const project = projects.find((p) => p.id === selectedProjectId);

  if (!project) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-1.5">
      {project.type === 'internal' ? (
        <Building2 className="h-4 w-4 text-amber-400" />
      ) : (
        <Globe className="h-4 w-4 text-cyan-400" />
      )}
      <span className="text-sm text-gray-300">{project.name}</span>
      <span className={cn(
        'rounded-full px-2 py-0.5 text-xs',
        project.type === 'internal' ? 'bg-amber-500/10 text-amber-400' : 'bg-cyan-500/10 text-cyan-400'
      )}>
        {project.type}
      </span>
    </div>
  );
}
