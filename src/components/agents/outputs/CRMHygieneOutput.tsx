'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
  Shield,
  Database,
  Users,
  Search,
  FileCheck,
  Layers,
  Activity,
  Clock,
  AlertTriangle,
  Copy,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  ArrowRight,
  Eye,
} from 'lucide-react';

interface Props {
  data?: any;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded hover:bg-accent transition-colors flex-shrink-0" title="Copy">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

function Section({
  title, icon, badge, badgeColor = 'bg-blue-500/20 text-blue-400', children, defaultOpen = false,
}: {
  title: string; icon: React.ReactNode; badge?: string; badgeColor?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full p-3 sm:p-4 flex items-center justify-between text-left hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="font-medium text-sm sm:text-base">{title}</span>
          {badge && <span className={`px-2 py-0.5 text-[10px] sm:text-xs rounded-full ${badgeColor}`}>{badge}</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-border/50">{children}</div>}
    </div>
  );
}

function ScoreBar({ label, value, max = 100, color = 'bg-green-500' }: { label: string; value: number; max?: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-gray-500/20 text-gray-400',
  contacted: 'bg-blue-500/20 text-blue-400',
  engaged: 'bg-cyan-500/20 text-cyan-400',
  qualified: 'bg-violet-500/20 text-violet-400',
  booked: 'bg-amber-500/20 text-amber-400',
  won: 'bg-green-500/20 text-green-400',
  churned: 'bg-red-500/20 text-red-400',
};

export function CRMHygieneOutput({ data }: Props) {
  const d = data?.data || data;

  if (!d || (!d.deduplication && !d.normalization)) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No CRM hygiene data yet. Run the CRM & Data Hygiene Agent to clean your database.
      </div>
    );
  }

  const dedup = d.deduplication || {};
  const norm = d.normalization || {};
  const val = d.validation || {};
  const enrich = d.enrichment || {};
  const lifecycle = d.lifecycleUpdates || [];
  const interactions = d.interactions || [];
  const interactionsByType = d.interactionsByType || {};
  const compliance = d.compliance || {};
  const qualityBreakdown = d.dataQualityBreakdown || {};
  const summary = d.summary || {};

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-teal-500" />
          <h3 className="font-semibold">CRM & Data Hygiene</h3>
          <span className="px-2 py-0.5 text-xs bg-teal-500/20 text-teal-400 rounded-full">
            {summary.totalRecords?.toLocaleString() || 0} records
          </span>
        </div>
        {d.confidence && (
          <span className="text-xs text-muted-foreground">
            Confidence: <span className="font-semibold text-green-400">{d.confidence}%</span>
          </span>
        )}
      </div>

      {/* Data Quality Score */}
      <div className="p-4 rounded-lg border bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-teal-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-400" />
            <span className="text-sm font-medium">Data Quality Score</span>
          </div>
          <div className="text-3xl font-bold text-teal-400">{d.dataQualityScore || 0}<span className="text-sm text-muted-foreground">/100</span></div>
        </div>
        {Object.keys(qualityBreakdown).length > 0 && (
          <div className="space-y-1.5">
            <ScoreBar label="Completeness" value={qualityBreakdown.completeness || 0} color="bg-teal-500" />
            <ScoreBar label="Accuracy" value={qualityBreakdown.accuracy || 0} color="bg-emerald-500" />
            <ScoreBar label="Consistency" value={qualityBreakdown.consistency || 0} color="bg-cyan-500" />
            <ScoreBar label="Timeliness" value={qualityBreakdown.timeliness || 0} color="bg-blue-500" />
            <ScoreBar label="Uniqueness" value={qualityBreakdown.uniqueness || 0} color="bg-violet-500" />
          </div>
        )}
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="p-2.5 sm:p-3 rounded-lg border bg-red-500/5 border-red-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] sm:text-xs text-red-400/80 font-medium uppercase tracking-wide">Duplicates</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-red-400">{dedup.duplicatesRemoved || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">removed ({dedup.accuracy || 99}% accuracy)</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-blue-500/5 border-blue-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] sm:text-xs text-blue-400/80 font-medium uppercase tracking-wide">Normalized</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-400">{summary.fieldsNormalized?.toLocaleString() || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">fields standardized</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-green-500/5 border-green-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Search className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[10px] sm:text-xs text-green-400/80 font-medium uppercase tracking-wide">Enriched</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-green-400">{enrich.recordsEnriched || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{enrich.enrichmentRate || 0}% coverage</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-violet-500/5 border-violet-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-[10px] sm:text-xs text-violet-400/80 font-medium uppercase tracking-wide">Interactions</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-violet-400">{d.totalInteractions?.toLocaleString() || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">touchpoints logged</div>
        </div>
      </div>

      {/* Deduplication */}
      <Section
        title="Deduplication"
        icon={<Users className="w-4 h-4 text-red-400" />}
        badge={`${dedup.duplicatesRemoved || 0} removed`}
        badgeColor="bg-red-500/20 text-red-400"
        defaultOpen
      >
        <div className="pt-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
            <div className="p-2 bg-muted/30 rounded">
              <div className="text-base font-bold">{dedup.totalRecords?.toLocaleString()}</div>
              <div className="text-muted-foreground">Total Records</div>
            </div>
            <div className="p-2 bg-muted/30 rounded">
              <div className="text-base font-bold text-red-400">{dedup.duplicatesFound}</div>
              <div className="text-muted-foreground">Duplicates Found</div>
            </div>
            <div className="p-2 bg-muted/30 rounded">
              <div className="text-base font-bold text-green-400">{dedup.accuracy}%</div>
              <div className="text-muted-foreground">Accuracy</div>
            </div>
            <div className="p-2 bg-muted/30 rounded">
              <div className="text-base font-bold">{dedup.duplicateRate}%</div>
              <div className="text-muted-foreground">Duplicate Rate</div>
            </div>
          </div>

          {dedup.matchingCriteria && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground mb-1.5">Matching Criteria</div>
              {dedup.matchingCriteria.map((mc: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-[10px] py-1 border-b border-border/30 last:border-0">
                  <span className="font-medium">{mc.field}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{mc.type}</span>
                    <span className="text-muted-foreground">weight: {mc.weight}</span>
                    <span className="font-medium">{mc.matchesFound} matches</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {dedup.duplicateExamples && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground mb-1.5">Merge Examples</div>
              {dedup.duplicateExamples.map((ex: any, idx: number) => (
                <div key={idx} className="p-2 bg-muted/30 rounded mb-1.5 text-[10px]">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                    <span className="font-medium text-green-400">Kept:</span>
                    <span>{ex.kept.email}</span>
                    <span className="text-muted-foreground">({ex.kept.interactions} interactions)</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                    <span className="font-medium text-red-400">Removed:</span>
                    <span>{ex.removed.email}</span>
                    <span className="text-muted-foreground">({ex.removed.interactions} interactions)</span>
                  </div>
                  <div className="text-muted-foreground">Match: {ex.matchType} ({ex.confidence}% confidence)</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Normalization */}
      <Section
        title="Field Normalization"
        icon={<RefreshCw className="w-4 h-4 text-blue-400" />}
        badge={`${norm.fieldsStandardized?.length || 0} fields`}
        badgeColor="bg-blue-500/20 text-blue-400"
      >
        <div className="pt-3 space-y-3">
          {norm.changes && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[10px]">
              {Object.entries(norm.changes).map(([field, info]: [string, any]) => (
                <div key={field} className="p-2 bg-muted/30 rounded">
                  <div className="text-base font-bold">{info.count}</div>
                  <div className="text-muted-foreground capitalize">{field}</div>
                  <div className="text-[9px] text-muted-foreground">{info.format}</div>
                </div>
              ))}
            </div>
          )}

          {norm.examples && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground mb-1.5">Examples</div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border/50">
                      <th className="text-left py-1.5 pr-2 font-medium">Field</th>
                      <th className="text-left py-1.5 px-2 font-medium">Before</th>
                      <th className="text-left py-1.5 px-2 font-medium"></th>
                      <th className="text-left py-1.5 pl-2 font-medium">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {norm.examples.map((ex: any, idx: number) => (
                      <tr key={idx} className="border-b border-border/30">
                        <td className="py-1.5 pr-2 capitalize">{ex.field}</td>
                        <td className="py-1.5 px-2 text-red-400 line-through">{ex.before}</td>
                        <td className="py-1.5 px-2"><ArrowRight className="w-3 h-3 text-muted-foreground" /></td>
                        <td className="py-1.5 pl-2 text-green-400 font-medium">{ex.after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Validation */}
      <Section
        title="Data Validation"
        icon={<FileCheck className="w-4 h-4 text-emerald-400" />}
        badge={`${val.validationRate || 0}% pass rate`}
        badgeColor="bg-emerald-500/20 text-emerald-400"
      >
        <div className="pt-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
            <div className="p-2 bg-green-500/10 rounded">
              <div className="text-base font-bold text-green-400">{val.validRecords?.toLocaleString()}</div>
              <div className="text-muted-foreground">Valid</div>
            </div>
            <div className="p-2 bg-red-500/10 rounded">
              <div className="text-base font-bold text-red-400">{val.invalidRecords}</div>
              <div className="text-muted-foreground">Invalid</div>
            </div>
            <div className="p-2 bg-yellow-500/10 rounded">
              <div className="text-base font-bold text-yellow-400">{val.quarantinedRecords}</div>
              <div className="text-muted-foreground">Quarantined</div>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded">
              <div className="text-base font-bold text-emerald-400">{val.validationRate}%</div>
              <div className="text-muted-foreground">Pass Rate</div>
            </div>
          </div>

          {val.invalidEmails && (
            <div>
              <div className="text-[10px] font-medium text-red-400 mb-1">Invalid Emails ({val.invalidEmails.length})</div>
              {val.invalidEmails.map((e: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-[10px] py-0.5">
                  <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                  <code className="text-red-400">{e.email}</code>
                  <span className="text-muted-foreground">— {e.reason}</span>
                </div>
              ))}
            </div>
          )}

          {val.invalidPhones && (
            <div>
              <div className="text-[10px] font-medium text-red-400 mb-1">Invalid Phones ({val.invalidPhones.length})</div>
              {val.invalidPhones.map((p: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-[10px] py-0.5">
                  <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                  <code className="text-red-400">{p.phone}</code>
                  <span className="text-muted-foreground">— {p.reason}</span>
                </div>
              ))}
            </div>
          )}

          {val.missingRequiredFields && (
            <div>
              <div className="text-[10px] font-medium text-yellow-400 mb-1">Missing Required Fields</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(val.missingRequiredFields).map(([field, count]: [string, any]) => (
                  <span key={field} className={`px-2 py-0.5 text-[10px] rounded ${count > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                    {field}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Enrichment */}
      <Section
        title="Data Enrichment"
        icon={<Search className="w-4 h-4 text-green-400" />}
        badge={`${enrich.recordsEnriched || 0} enriched`}
        badgeColor="bg-green-500/20 text-green-400"
      >
        <div className="pt-3 space-y-3">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
            Sources: {enrich.sources?.map((s: string, idx: number) => (
              <span key={idx} className="px-1.5 py-0.5 bg-muted/50 rounded">{s}</span>
            ))}
          </div>

          {enrich.breakdown && (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/50">
                    <th className="text-left py-1.5 font-medium">Field</th>
                    <th className="text-right py-1.5 font-medium">Enriched</th>
                    <th className="text-left py-1.5 pl-3 font-medium">Source</th>
                    <th className="text-right py-1.5 font-medium">Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(enrich.breakdown).map(([field, info]: [string, any]) => (
                    <tr key={field} className="border-b border-border/30">
                      <td className="py-1.5 font-medium">{field.replace(/_/g, ' ')}</td>
                      <td className="text-right py-1.5">{info.enriched}</td>
                      <td className="py-1.5 pl-3 text-muted-foreground">{info.source}</td>
                      <td className="text-right py-1.5 text-green-400">{info.coverage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {enrich.enrichmentExamples && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground mb-1.5">Enrichment Examples</div>
              {enrich.enrichmentExamples.map((ex: any, idx: number) => (
                <div key={idx} className="p-2 bg-muted/30 rounded mb-1.5 text-[10px]">
                  <div className="font-medium mb-1">{ex.lead}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-red-400 text-[9px]">Before:</span>
                      <div className="text-muted-foreground">{ex.before.industry || 'null'}, {ex.before.employees || 'null'} employees</div>
                    </div>
                    <div>
                      <span className="text-green-400 text-[9px]">After:</span>
                      <div>{ex.after.industry}, {ex.after.employees} employees, {ex.after.revenue}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Lifecycle Updates */}
      {lifecycle.length > 0 && (
        <Section
          title="Lifecycle Transitions"
          icon={<Layers className="w-4 h-4 text-amber-400" />}
          badge={`${lifecycle.length} transitions`}
          badgeColor="bg-amber-500/20 text-amber-400"
        >
          <div className="pt-3 space-y-1.5">
            {lifecycle.map((update: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-[10px]">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="font-medium truncate">{update.leadName || update.leadId}</span>
                  <span className={`px-1.5 py-0.5 rounded ${STAGE_COLORS[update.from] || 'bg-gray-500/20 text-gray-400'}`}>{update.from}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className={`px-1.5 py-0.5 rounded ${STAGE_COLORS[update.to] || 'bg-gray-500/20 text-gray-400'}`}>{update.to}</span>
                </div>
                <span className="text-muted-foreground truncate flex-shrink-0 max-w-[200px]">{update.reason}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Interactions */}
      <Section
        title="Interaction Log"
        icon={<Activity className="w-4 h-4 text-violet-400" />}
        badge={`${d.totalInteractions?.toLocaleString() || 0} total`}
        badgeColor="bg-violet-500/20 text-violet-400"
      >
        <div className="pt-3 space-y-3">
          {Object.keys(interactionsByType).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(interactionsByType).map(([type, count]: [string, any]) => (
                <span key={type} className="px-2 py-0.5 text-[10px] bg-muted/50 rounded border border-border/50">
                  {type.replace(/_/g, ' ')}: <span className="font-bold">{count}</span>
                </span>
              ))}
            </div>
          )}

          {interactions.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground mb-1.5">Recent Activity</div>
              {interactions.slice(0, 8).map((item: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0 text-[10px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.type.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground">— {item.leadId}</span>
                      <span className="px-1.5 py-0.5 bg-muted/30 rounded text-[9px]">{item.channel}</span>
                    </div>
                    <div className="text-muted-foreground">{item.summary}</div>
                  </div>
                  <span className="text-[9px] text-muted-foreground flex-shrink-0 whitespace-nowrap">
                    {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Compliance */}
      <Section
        title="Compliance Status"
        icon={<Shield className="w-4 h-4 text-emerald-400" />}
        badge="fully compliant"
        badgeColor="bg-emerald-500/20 text-emerald-400"
      >
        <div className="pt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* GDPR */}
            {compliance.gdpr && (
              <div className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle className={`w-3.5 h-3.5 ${compliance.gdpr.compliant ? 'text-green-400' : 'text-red-400'}`} />
                  <span className="text-xs font-medium">GDPR</span>
                </div>
                <div className="space-y-0.5 text-[10px] text-muted-foreground">
                  <div>Consent tracked: {compliance.gdpr.consentRecordsTracked}</div>
                  <div>Erasure requests: {compliance.gdpr.erasureRequestsProcessed} done, {compliance.gdpr.erasureRequestsPending} pending</div>
                  <div>Consent rate: {compliance.gdpr.consentRate}%</div>
                </div>
              </div>
            )}

            {/* CAN-SPAM */}
            {compliance.canSpam && (
              <div className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle className={`w-3.5 h-3.5 ${compliance.canSpam.compliant ? 'text-green-400' : 'text-red-400'}`} />
                  <span className="text-xs font-medium">CAN-SPAM</span>
                </div>
                <div className="space-y-0.5 text-[10px] text-muted-foreground">
                  <div>Unsubscribes pending: {compliance.canSpam.unsubscribesPending}</div>
                  <div>Processed (24h): {compliance.canSpam.unsubscribesProcessed24h}</div>
                  <div>Physical address: {compliance.canSpam.physicalAddressPresent ? 'present' : 'missing'}</div>
                </div>
              </div>
            )}

            {/* TCPA */}
            {compliance.tcpa && (
              <div className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle className={`w-3.5 h-3.5 ${compliance.tcpa.compliant ? 'text-green-400' : 'text-red-400'}`} />
                  <span className="text-xs font-medium">TCPA</span>
                </div>
                <div className="space-y-0.5 text-[10px] text-muted-foreground">
                  <div>Call consent verified: {compliance.tcpa.callConsentVerified}</div>
                  <div>DNC checked: {compliance.tcpa.dncListChecked ? 'yes' : 'no'}</div>
                  <div>DNC matches: {compliance.tcpa.dncMatches}</div>
                </div>
              </div>
            )}
          </div>

          {compliance.dataRetention && (
            <div className="p-2 bg-muted/20 rounded text-[10px]">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">Data Retention</span>
              </div>
              <div className="text-muted-foreground">
                Policy: {compliance.dataRetention.policy} | Expiring in 30d: {compliance.dataRetention.recordsExpiring30d} | Archived: {compliance.dataRetention.recordsArchived}
              </div>
            </div>
          )}

          {compliance.auditTrail && (
            <div className="p-2 bg-muted/20 rounded text-[10px]">
              <div className="flex items-center gap-1.5 mb-1">
                <Eye className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">Audit Trail</span>
              </div>
              <div className="flex flex-wrap gap-2 text-muted-foreground">
                <span>Total: {compliance.auditTrail.totalEntries?.toLocaleString()}</span>
                <span>Last 7d: {compliance.auditTrail.last7Days}</span>
                {compliance.auditTrail.accessTypes && Object.entries(compliance.auditTrail.accessTypes).map(([type, count]: [string, any]) => (
                  <span key={type} className="px-1.5 py-0.5 bg-muted/30 rounded">{type}: {count?.toLocaleString()}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Summary */}
      <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
        <div className="text-xs font-medium text-muted-foreground mb-2">Hygiene Summary</div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-[10px]">
          <div className="p-2 bg-red-500/10 rounded">
            <div className="text-base font-bold text-red-400">{summary.duplicatesRemoved || 0}</div>
            <div className="text-muted-foreground">Deduped</div>
          </div>
          <div className="p-2 bg-blue-500/10 rounded">
            <div className="text-base font-bold text-blue-400">{summary.fieldsNormalized?.toLocaleString() || 0}</div>
            <div className="text-muted-foreground">Normalized</div>
          </div>
          <div className="p-2 bg-yellow-500/10 rounded">
            <div className="text-base font-bold text-yellow-400">{summary.invalidRecordsQuarantined || 0}</div>
            <div className="text-muted-foreground">Quarantined</div>
          </div>
          <div className="p-2 bg-green-500/10 rounded">
            <div className="text-base font-bold text-green-400">{summary.recordsEnriched || 0}</div>
            <div className="text-muted-foreground">Enriched</div>
          </div>
          <div className="p-2 bg-violet-500/10 rounded">
            <div className="text-base font-bold text-violet-400">{summary.lifecycleTransitions || 0}</div>
            <div className="text-muted-foreground">Transitions</div>
          </div>
        </div>
      </div>

      {/* Reasoning */}
      {d.reasoning && (
        <div className="p-3 sm:p-4 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 rounded-lg border border-teal-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">Hygiene Analysis</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{d.reasoning}</p>
        </div>
      )}
    </div>
  );
}

export default CRMHygieneOutput;
