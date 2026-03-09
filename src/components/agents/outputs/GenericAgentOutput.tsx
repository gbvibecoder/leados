'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Hash,
  Type,
  List,
  Braces,
  ToggleLeft,
  Copy,
  Check
} from 'lucide-react';

interface Props {
  data: any;
  agentId?: string;
  agentName?: string;
}

export function GenericAgentOutput({ data, agentId, agentName }: Props) {
  const [copied, setCopied] = useState(false);

  if (!data) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No output data available
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract key metrics for summary
  const summary = extractSummary(data);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summary.map((item, idx) => (
            <div key={idx} className={`p-3 rounded-lg ${item.bgColor} border ${item.borderColor}`}>
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className={`text-lg font-bold ${item.textColor}`}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Tree View */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-3 bg-muted/30 flex items-center justify-between border-b border-border">
          <span className="text-sm font-medium">Output Data</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-muted rounded transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
        </div>
        <div className="p-3 max-h-[500px] overflow-auto">
          <TreeNode data={data} name="root" isRoot />
        </div>
      </div>
    </div>
  );
}

function TreeNode({
  data,
  name,
  isRoot = false,
  depth = 0
}: {
  data: any;
  name: string;
  isRoot?: boolean;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  const type = getType(data);
  const isExpandable = type === 'object' || type === 'array';
  const isEmpty = isExpandable && (Array.isArray(data) ? data.length === 0 : Object.keys(data).length === 0);

  const TypeIcon = {
    string: Type,
    number: Hash,
    boolean: ToggleLeft,
    array: List,
    object: Braces,
    null: AlertCircle,
  }[type] || AlertCircle;

  const typeColor = {
    string: 'text-green-400',
    number: 'text-blue-400',
    boolean: 'text-purple-400',
    array: 'text-orange-400',
    object: 'text-cyan-400',
    null: 'text-muted-foreground',
  }[type];

  if (!isExpandable) {
    return (
      <div className="flex items-center gap-2 py-1" style={{ paddingLeft: `${depth * 16}px` }}>
        <TypeIcon className={`w-3.5 h-3.5 ${typeColor}`} />
        {!isRoot && <span className="text-muted-foreground text-sm">{name}:</span>}
        <span className={`text-sm ${typeColor}`}>
          {type === 'string' ? `"${data}"` : String(data)}
        </span>
      </div>
    );
  }

  const entries = Array.isArray(data) ? data.map((v, i) => [i, v]) : Object.entries(data);
  const preview = getPreview(data, type);

  return (
    <div style={{ paddingLeft: isRoot ? 0 : `${depth * 16}px` }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 py-1 hover:bg-muted/50 rounded px-1 -ml-1 w-full text-left"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <TypeIcon className={`w-3.5 h-3.5 ${typeColor}`} />
        {!isRoot && <span className="text-muted-foreground text-sm">{name}:</span>}
        <span className="text-xs text-muted-foreground">
          {preview}
        </span>
      </button>

      {expanded && !isEmpty && (
        <div className="border-l border-border/50 ml-2">
          {entries.map(([key, value]) => (
            <TreeNode key={key} data={value} name={String(key)} depth={depth + 1} />
          ))}
        </div>
      )}

      {expanded && isEmpty && (
        <div className="text-xs text-muted-foreground py-1" style={{ paddingLeft: `${(depth + 1) * 16}px` }}>
          {type === 'array' ? '(empty array)' : '(empty object)'}
        </div>
      )}
    </div>
  );
}

function getType(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function getPreview(data: any, type: string): string {
  if (type === 'array') {
    return `[${data.length} items]`;
  }
  if (type === 'object') {
    const keys = Object.keys(data);
    if (keys.length <= 3) {
      return `{${keys.join(', ')}}`;
    }
    return `{${keys.length} properties}`;
  }
  return '';
}

function extractSummary(data: any): Array<{
  label: string;
  value: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}> {
  const summary = [];

  // Check for common patterns
  if (data.success !== undefined) {
    summary.push({
      label: 'Status',
      value: data.success ? 'Success' : 'Failed',
      bgColor: data.success ? 'bg-green-500/10' : 'bg-red-500/10',
      borderColor: data.success ? 'border-green-500/20' : 'border-red-500/20',
      textColor: data.success ? 'text-green-400' : 'text-red-400',
    });
  }

  if (data.confidence !== undefined) {
    summary.push({
      label: 'Confidence',
      value: `${data.confidence}%`,
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      textColor: 'text-blue-400',
    });
  }

  if (data.data?.decision) {
    const isGo = data.data.decision === 'GO';
    summary.push({
      label: 'Decision',
      value: data.data.decision,
      bgColor: isGo ? 'bg-green-500/10' : 'bg-yellow-500/10',
      borderColor: isGo ? 'border-green-500/20' : 'border-yellow-500/20',
      textColor: isGo ? 'text-green-400' : 'text-yellow-400',
    });
  }

  // Count items in arrays
  if (data.data?.opportunities?.length) {
    summary.push({
      label: 'Opportunities',
      value: String(data.data.opportunities.length),
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      textColor: 'text-purple-400',
    });
  }

  if (data.data?.campaigns?.length) {
    summary.push({
      label: 'Campaigns',
      value: String(data.data.campaigns.length),
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      textColor: 'text-orange-400',
    });
  }

  return summary.slice(0, 4);
}

export default GenericAgentOutput;
