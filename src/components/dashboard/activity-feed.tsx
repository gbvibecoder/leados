'use client';

import { Bot, CheckCircle2, AlertCircle, Zap, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, ActivityItem } from '@/lib/store';

const iconMap = {
  agent_started: { icon: Bot, color: 'text-blue-400' },
  agent_completed: { icon: CheckCircle2, color: 'text-emerald-400' },
  agent_error: { icon: AlertCircle, color: 'text-red-400' },
  pipeline_completed: { icon: Zap, color: 'text-indigo-400' },
  info: { icon: Info, color: 'text-zinc-400' },
};

export function ActivityFeed() {
  const { activityFeed } = useAppStore();

  const items: ActivityItem[] = activityFeed.length > 0 ? activityFeed : [
    {
      id: '1',
      type: 'info',
      message: 'System initialized. Ready to run pipeline.',
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'agent_completed',
      agentName: 'Service Research Agent',
      message: 'Discovered 5 high-demand service opportunities',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '3',
      type: 'pipeline_completed',
      message: 'LeadOS pipeline completed — 47 leads generated',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="mb-4 text-sm font-semibold text-zinc-200">Recent Activity</h3>
      <div className="space-y-3">
        {items.slice(0, 10).map((item) => {
          const config = iconMap[item.type];
          const Icon = config.icon;
          return (
            <div key={item.id} className="flex gap-3">
              <div className="mt-0.5">
                <Icon className={cn('h-4 w-4', config.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-300">{item.message}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  {item.agentName && (
                    <span className="text-xs text-zinc-500">{item.agentName}</span>
                  )}
                  <span className="text-xs text-zinc-600">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
