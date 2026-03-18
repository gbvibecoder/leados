'use client';

import { Bot, Check, X, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentToggleCardProps {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  skipped?: boolean;
  skipReason?: string;
  onToggle: () => void;
  onCardClick?: () => void;
}

export function AgentToggleCard({
  id,
  name,
  description,
  enabled,
  skipped,
  skipReason,
  onToggle,
  onCardClick,
}: AgentToggleCardProps) {
  return (
    <div
      onClick={() => {
        if (!skipped && onCardClick) onCardClick();
      }}
      className={cn(
        'group relative cursor-pointer rounded-xl border p-5 transition-all',
        skipped
          ? 'cursor-not-allowed border-white/[0.04]/40 bg-zinc-900/20 opacity-50'
          : enabled
            ? 'border-cyan-500/40 bg-cyan-950/20 hover:border-cyan-500/60 hover:bg-cyan-950/30'
            : 'border-white/[0.04] bg-[rgba(2,2,5,0.6)]/40 hover:border-cyan-500/15 hover:bg-zinc-900/60'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
          skipped ? 'bg-white/[0.03] text-gray-600' :
          enabled ? 'bg-cyan-600/20 text-cyan-400' : 'bg-white/5 text-gray-500'
        )}>
          <Bot className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              'text-sm font-semibold',
              skipped ? 'text-gray-600 line-through' :
              enabled ? 'text-white' : 'text-gray-400'
            )}>
              {name}
            </h4>
            {skipped && skipReason && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                {skipReason}
              </span>
            )}
          </div>
          <p className={cn(
            'mt-1 text-xs leading-relaxed',
            skipped ? 'text-zinc-700' :
            enabled ? 'text-gray-400' : 'text-gray-600'
          )}>
            {description}
          </p>
        </div>

        {/* Toggle switch — only toggles on switch click, not the whole card */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!skipped) onToggle();
          }}
          className={cn(
            'flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors',
            skipped ? 'bg-white/[0.03] cursor-not-allowed' :
            enabled ? 'bg-cyan-600' : 'bg-white/5'
          )}
        >
          <div className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full transition-all',
            skipped ? 'bg-zinc-700 translate-x-0' :
            enabled ? 'translate-x-6 bg-white' : 'translate-x-0 bg-zinc-600'
          )}>
            {skipped ? (
              <SkipForward className="h-3 w-3 text-gray-500" />
            ) : enabled ? (
              <Check className="h-3 w-3 text-indigo-600" />
            ) : (
              <X className="h-3 w-3 text-gray-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
