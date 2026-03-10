'use client';

import React, { useState } from 'react';
import {
  Phone,
  PhoneOff,
  PhoneMissed,
  Voicemail,
  Users,
  ChevronDown,
  ChevronUp,
  Check,
  Target,
  TrendingUp,
  Sparkles,
  Clock,
  Shield,
  MessageSquare,
  UserCheck,
  ShoppingCart,
  Calendar,
  Mail,
  XCircle,
  Mic,
  FileText,
  AlertTriangle,
  Copy,
  Gauge,
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

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 85 ? 'bg-green-500' : pct >= 70 ? 'bg-blue-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-bold w-6 text-right">{score}</span>
    </div>
  );
}

function BANTBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-16 text-muted-foreground">{label}</span>
      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-medium">{value}/{max}</span>
    </div>
  );
}

const OUTCOME_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bgColor: string }> = {
  high_intent_checkout: { icon: <ShoppingCart className="w-3 h-3" />, label: 'Checkout', color: 'text-green-400', bgColor: 'bg-green-500/20 text-green-400 border-green-500/30' },
  high_intent_sales: { icon: <Calendar className="w-3 h-3" />, label: 'Sales Call', color: 'text-blue-400', bgColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  medium_intent: { icon: <Mail className="w-3 h-3" />, label: 'Nurture', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  low_intent: { icon: <XCircle className="w-3 h-3" />, label: 'Disqualified', color: 'text-red-400', bgColor: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  completed: { icon: <Phone className="w-3 h-3" />, color: 'text-green-400' },
  no_answer: { icon: <PhoneMissed className="w-3 h-3" />, color: 'text-orange-400' },
  voicemail: { icon: <Voicemail className="w-3 h-3" />, color: 'text-yellow-400' },
  declined: { icon: <PhoneOff className="w-3 h-3" />, color: 'text-red-400' },
};

const SENTIMENT_CONFIG: Record<string, string> = {
  positive: 'bg-green-500/20 text-green-400',
  neutral: 'bg-gray-500/20 text-gray-400',
  hesitant: 'bg-yellow-500/20 text-yellow-400',
  negative: 'bg-red-500/20 text-red-400',
};

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function AIQualificationOutput({ data }: Props) {
  const d = data?.data || data;
  const [expandedCall, setExpandedCall] = useState<number | null>(null);

  if (!d || (!d.callScript && !d.callResults)) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No qualification data yet. Run the AI Qualification Agent to conduct voice calls and score leads.
      </div>
    );
  }

  const voiceConfig = d.voiceConfig || {};
  const callScript = d.callScript || {};
  const thresholds = d.qualificationThresholds || {};
  const callResults = d.callResults || [];
  const summary = d.summary || {};

  const completedCalls = callResults.filter((c: any) => c.callStatus === 'completed');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-violet-500" />
          <h3 className="font-semibold">AI Qualification Calls</h3>
          <span className="px-2 py-0.5 text-xs bg-violet-500/20 text-violet-400 rounded-full">
            {callResults.length} calls
          </span>
        </div>
        {d.confidence && (
          <span className="text-xs text-muted-foreground">
            Confidence: <span className="font-semibold text-green-400">{d.confidence}%</span>
          </span>
        )}
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        <div className="p-2.5 sm:p-3 rounded-lg border bg-violet-500/5 border-violet-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Phone className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-[10px] sm:text-xs text-violet-400/80 font-medium uppercase tracking-wide">Calls</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-violet-400">{summary.totalCallsCompleted || completedCalls.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">of {summary.totalCallsAttempted || callResults.length} attempted</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-green-500/5 border-green-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <ShoppingCart className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[10px] sm:text-xs text-green-400/80 font-medium uppercase tracking-wide">Checkout</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-green-400">{summary.highIntentCheckout || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">ready to buy</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-blue-500/5 border-blue-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] sm:text-xs text-blue-400/80 font-medium uppercase tracking-wide">Sales Call</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-400">{summary.highIntentSales || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">booked for human call</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-orange-500/5 border-orange-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Gauge className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] sm:text-xs text-orange-400/80 font-medium uppercase tracking-wide">Avg Score</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-orange-400">{summary.avgScore || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">BANT score</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] sm:text-xs text-emerald-400/80 font-medium uppercase tracking-wide">Qualified</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400">{summary.qualificationRate || 0}%</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">qualification rate</div>
        </div>
      </div>

      {/* Outcome Distribution */}
      <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
        <div className="text-xs font-medium text-muted-foreground mb-2">Routing Distribution</div>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(OUTCOME_CONFIG).map(([key, config]) => {
            const count = key === 'high_intent_checkout' ? (summary.highIntentCheckout || 0) :
                          key === 'high_intent_sales' ? (summary.highIntentSales || 0) :
                          key === 'medium_intent' ? (summary.mediumIntent || 0) :
                          (summary.lowIntent || 0);
            return (
              <div key={key} className={`p-2 rounded-lg border text-center ${config.bgColor}`}>
                <div className="flex items-center justify-center gap-1 mb-1">
                  {config.icon}
                  <span className="text-[10px] font-medium">{config.label}</span>
                </div>
                <div className="text-lg font-bold">{count}</div>
              </div>
            );
          })}
        </div>
        {summary.avgCallDuration > 0 && (
          <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
            <span><Clock className="w-3 h-3 inline mr-0.5" />Avg duration: <span className="text-foreground font-medium">{formatDuration(summary.avgCallDuration)}</span></span>
            {summary.topObjection && summary.topObjection !== 'None' && (
              <span><AlertTriangle className="w-3 h-3 inline mr-0.5 text-yellow-400" />Top objection: <span className="text-foreground font-medium">{summary.topObjection}</span></span>
            )}
          </div>
        )}
      </div>

      {/* Call Results */}
      {callResults.length > 0 && (
        <Section
          title="Call Results"
          icon={<Mic className="w-4 h-4 text-violet-400" />}
          badge={`${callResults.length} leads called`}
          badgeColor="bg-violet-500/20 text-violet-400"
          defaultOpen
        >
          <div className="space-y-2 pt-3">
            {callResults.map((call: any, idx: number) => {
              const outcomeConfig = OUTCOME_CONFIG[call.outcome] || OUTCOME_CONFIG.low_intent;
              const statusConfig = STATUS_CONFIG[call.callStatus] || STATUS_CONFIG.completed;
              const isExpanded = expandedCall === idx;

              return (
                <div key={idx} className="rounded-lg border border-border/50 overflow-hidden">
                  {/* Call Header */}
                  <button
                    onClick={() => setExpandedCall(isExpanded ? null : idx)}
                    className="w-full p-3 flex items-center justify-between text-left hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex-shrink-0 ${statusConfig.color}`}>{statusConfig.icon}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{call.leadName}</span>
                          <span className="text-[10px] text-muted-foreground">{call.company}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-1.5 py-0.5 text-[10px] rounded border ${outcomeConfig.bgColor}`}>
                            {outcomeConfig.label}
                          </span>
                          {call.callStatus === 'completed' && (
                            <>
                              <span className="text-[10px] text-muted-foreground">{formatDuration(call.duration)}</span>
                              <span className="text-[10px] font-medium">Score: {call.score}/100</span>
                            </>
                          )}
                          {call.sentiment && call.callStatus === 'completed' && (
                            <span className={`px-1 py-0.5 text-[9px] rounded ${SENTIMENT_CONFIG[call.sentiment] || ''}`}>
                              {call.sentiment}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-border/30 space-y-3">
                      {/* BANT Breakdown */}
                      {call.bantBreakdown && call.score > 0 && (
                        <div className="pt-3">
                          <div className="text-[10px] font-medium text-violet-400 uppercase tracking-wide mb-2">BANT Score Breakdown</div>
                          <div className="space-y-1.5">
                            <BANTBar label="Budget" value={call.bantBreakdown.budget} max={30} color="bg-green-500" />
                            <BANTBar label="Authority" value={call.bantBreakdown.authority} max={25} color="bg-blue-500" />
                            <BANTBar label="Need" value={call.bantBreakdown.need} max={25} color="bg-purple-500" />
                            <BANTBar label="Timeline" value={call.bantBreakdown.timeline} max={20} color="bg-orange-500" />
                          </div>
                        </div>
                      )}

                      {/* Key Signals */}
                      {call.keySignals?.length > 0 && (
                        <div>
                          <div className="text-[10px] font-medium text-green-400 uppercase tracking-wide mb-1">Key Signals</div>
                          <div className="flex flex-wrap gap-1">
                            {call.keySignals.map((signal: string, sIdx: number) => (
                              <span key={sIdx} className="px-1.5 py-0.5 text-[10px] bg-green-500/10 text-green-400 rounded">{signal}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Objections */}
                      {call.objectionsRaised?.length > 0 && (
                        <div>
                          <div className="text-[10px] font-medium text-yellow-400 uppercase tracking-wide mb-1">Objections Raised</div>
                          <div className="flex flex-wrap gap-1">
                            {call.objectionsRaised.map((obj: string, oIdx: number) => (
                              <span key={oIdx} className="px-1.5 py-0.5 text-[10px] bg-yellow-500/10 text-yellow-400 rounded">{obj}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Routing Action */}
                      <div className="p-2 bg-muted/30 rounded text-xs">
                        <span className="text-muted-foreground">Routing: </span>
                        <span className="font-medium">{call.routingAction}</span>
                      </div>

                      {/* Transcript */}
                      {call.transcript && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Call Transcript</div>
                            <CopyButton text={call.transcript} />
                          </div>
                          <div className="p-2.5 bg-background/50 rounded border border-border/30 text-xs whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto font-mono">
                            {call.transcript}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Call Script */}
      <Section
        title="Call Script & BANT Questions"
        icon={<FileText className="w-4 h-4 text-blue-400" />}
        badge="BANT framework"
        badgeColor="bg-blue-500/20 text-blue-400"
      >
        <div className="space-y-3 pt-3">
          {/* Greeting */}
          {callScript.greeting && (
            <div className="p-2.5 bg-blue-500/5 rounded-lg border border-blue-500/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-blue-400 uppercase tracking-wide">Greeting</span>
                <CopyButton text={callScript.greeting} />
              </div>
              <p className="text-xs leading-relaxed">{callScript.greeting}</p>
            </div>
          )}

          {/* BANT Questions */}
          {callScript.qualificationQuestions && (
            <div>
              <div className="text-[10px] font-medium text-violet-400 uppercase tracking-wide mb-2">Qualification Questions</div>
              <div className="space-y-2">
                {Object.entries(callScript.qualificationQuestions).map(([key, q]: [string, any]) => (
                  <div key={key} className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-1.5 py-0.5 text-[10px] rounded font-bold uppercase ${
                        key === 'budget' ? 'bg-green-500/20 text-green-400' :
                        key === 'authority' ? 'bg-blue-500/20 text-blue-400' :
                        key === 'need' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-orange-500/20 text-orange-400'
                      }`}>{key}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {key === 'budget' ? '(30 pts)' : key === 'authority' ? '(25 pts)' : key === 'need' ? '(25 pts)' : '(20 pts)'}
                      </span>
                    </div>
                    <p className="text-xs font-medium mb-1">{q.question}</p>
                    {q.followUp && <p className="text-[10px] text-muted-foreground italic mb-1.5">Follow-up: {q.followUp}</p>}
                    {q.goodAnswers?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {q.goodAnswers.map((a: string, aIdx: number) => (
                          <span key={aIdx} className="px-1.5 py-0.5 text-[10px] bg-green-500/10 text-green-400 rounded">{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Closing Scripts */}
          {callScript.closingScripts && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Closing Scripts by Outcome</div>
              <div className="space-y-1.5">
                {Object.entries(callScript.closingScripts).map(([key, script]: [string, any]) => {
                  const config = OUTCOME_CONFIG[key];
                  return (
                    <div key={key} className="p-2 bg-muted/20 rounded border border-border/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`px-1.5 py-0.5 text-[10px] rounded border ${config?.bgColor || 'bg-muted'}`}>
                          {config?.label || key}
                        </span>
                        <CopyButton text={script} />
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{script}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Objection Handling */}
      {callScript.objectionHandling && Object.keys(callScript.objectionHandling).length > 0 && (
        <Section
          title="Objection Handling Library"
          icon={<MessageSquare className="w-4 h-4 text-yellow-400" />}
          badge={`${Object.keys(callScript.objectionHandling).length} objections`}
          badgeColor="bg-yellow-500/20 text-yellow-400"
        >
          <div className="space-y-2 pt-3">
            {Object.entries(callScript.objectionHandling).map(([objection, response]: [string, any]) => (
              <div key={objection} className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-yellow-400">"{objection}"</span>
                  <CopyButton text={response} />
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{response}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Qualification Thresholds */}
      {Object.keys(thresholds).length > 0 && (
        <Section
          title="Routing Thresholds"
          icon={<Target className="w-4 h-4 text-emerald-400" />}
          badge="4 tiers"
          badgeColor="bg-emerald-500/20 text-emerald-400"
        >
          <div className="space-y-2 pt-3">
            {Object.entries(thresholds).map(([key, t]: [string, any]) => {
              const config = OUTCOME_CONFIG[key];
              return (
                <div key={key} className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-lg border border-border/50">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config?.bgColor || 'bg-muted'}`}>
                    <span className="text-sm font-bold">{t.minScore}+</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{config?.label || key}</span>
                      <span className="text-[10px] text-muted-foreground">— {t.action}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Voice Config */}
      {voiceConfig.provider && (
        <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Mic className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-medium">Voice Configuration</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div><span className="text-muted-foreground">Provider: </span><span className="font-medium capitalize">{voiceConfig.provider.replace(/_/g, ' ')}</span></div>
            {voiceConfig.voiceName && <div><span className="text-muted-foreground">Voice: </span><span className="font-medium">{voiceConfig.voiceName}</span></div>}
            <div><span className="text-muted-foreground">Max Duration: </span><span className="font-medium">{formatDuration(voiceConfig.maxCallDuration || 300)}</span></div>
            <div>
              <span className="text-muted-foreground">Recording: </span>
              <span className={voiceConfig.recordingEnabled ? 'text-green-400' : 'text-red-400'}>{voiceConfig.recordingEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
          {voiceConfig.consentScript && (
            <div className="mt-2 p-2 bg-violet-500/5 rounded border border-violet-500/10 text-[10px]">
              <Shield className="w-3 h-3 text-violet-400 inline mr-1" />
              <span className="text-muted-foreground">Consent: </span>{voiceConfig.consentScript}
            </div>
          )}
        </div>
      )}

      {/* Reasoning */}
      {d.reasoning && (
        <div className="p-3 sm:p-4 bg-gradient-to-r from-violet-500/10 to-blue-500/10 rounded-lg border border-violet-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">Qualification Strategy</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{d.reasoning}</p>
        </div>
      )}
    </div>
  );
}

export default AIQualificationOutput;
