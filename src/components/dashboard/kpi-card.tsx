'use client';

import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  color?: 'indigo' | 'emerald' | 'amber' | 'red' | 'blue';
}

const colorMap = {
  indigo: { bg: 'bg-indigo-900/30', text: 'text-indigo-400', icon: 'text-indigo-400' },
  emerald: { bg: 'bg-emerald-900/30', text: 'text-emerald-400', icon: 'text-emerald-400' },
  amber: { bg: 'bg-amber-900/30', text: 'text-amber-400', icon: 'text-amber-400' },
  red: { bg: 'bg-red-900/30', text: 'text-red-400', icon: 'text-red-400' },
  blue: { bg: 'bg-blue-900/30', text: 'text-blue-400', icon: 'text-blue-400' },
};

export function KPICard({ title, value, change, changeLabel, icon: Icon, color = 'indigo' }: KPICardProps) {
  const colors = colorMap[color];
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-400">{title}</p>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', colors.bg)}>
          <Icon className={cn('h-5 w-5', colors.icon)} />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {change !== undefined && (
        <div className="mt-1 flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-emerald-400" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-400" />
          )}
          <span className={cn('text-xs font-medium', isPositive ? 'text-emerald-400' : 'text-red-400')}>
            {isPositive ? '+' : ''}{change}%
          </span>
          {changeLabel && <span className="text-xs text-zinc-500">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
}
