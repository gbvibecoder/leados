'use client';

import React, { useState } from 'react';
import {
  Mail,
  Linkedin,
  Users,
  Send,
  Clock,
  Shield,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Target,
  TrendingUp,
  Calendar,
  UserPlus,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Globe,
  FlaskConical,
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
    } catch {
      // Fallback
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-accent transition-colors flex-shrink-0"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-400" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      )}
    </button>
  );
}

function Section({
  title,
  icon,
  badge,
  badgeColor = 'bg-blue-500/20 text-blue-400',
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-3 sm:p-4 flex items-center justify-between text-left hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="font-medium text-sm sm:text-base">{title}</span>
          {badge && (
            <span className={`px-2 py-0.5 text-[10px] sm:text-xs rounded-full ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-border/50">{children}</div>}
    </div>
  );
}

const STEP_COLORS: Record<string, string> = {
  connection_request: 'bg-sky-500/20 text-sky-400',
  value_message: 'bg-green-500/20 text-green-400',
  case_study: 'bg-purple-500/20 text-purple-400',
  direct_ask: 'bg-orange-500/20 text-orange-400',
  follow_up: 'bg-yellow-500/20 text-yellow-400',
  message: 'bg-green-500/20 text-green-400',
};

export function OutboundOutreachOutput({ data }: Props) {
  const d = data?.data || data;

  if (!d || (!d.coldEmail && !d.linkedIn)) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No outreach data yet. Run the Outbound Outreach Agent to set up cold email and LinkedIn campaigns.
      </div>
    );
  }

  const coldEmail = d.coldEmail || {};
  const linkedIn = d.linkedIn || {};
  const metrics = d.projectedMetrics || {};
  const prospects = d.prospectList || [];
  const totalSequenceSteps = (coldEmail.sequences?.length || 0) + (linkedIn.sequences?.length || 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold">Outbound Outreach Campaign</h3>
          <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
            2 channels
          </span>
        </div>
        {d.confidence && (
          <span className="text-xs text-muted-foreground">
            Confidence: <span className="font-semibold text-green-400">{d.confidence}%</span>
          </span>
        )}
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="p-2.5 sm:p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Mail className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] sm:text-xs text-emerald-400/80 font-medium uppercase tracking-wide">Emails</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400">{(metrics.emailsSent || coldEmail.prospectCount || 0).toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">prospects targeted</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-sky-500/5 border-sky-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Linkedin className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px] sm:text-xs text-sky-400/80 font-medium uppercase tracking-wide">LinkedIn</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-sky-400">{(metrics.linkedInConnectionsSent || linkedIn.targetProfiles || 0).toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">profiles targeted</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-purple-500/5 border-purple-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] sm:text-xs text-purple-400/80 font-medium uppercase tracking-wide">Meetings</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-400">{metrics.totalMeetingsFromOutbound || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">projected/month</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-orange-500/5 border-orange-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] sm:text-xs text-orange-400/80 font-medium uppercase tracking-wide">Cost/Meeting</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-orange-400">${metrics.estimatedCostPerMeeting || '—'}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">est. per booked call</div>
        </div>
      </div>

      {/* Channel Performance Split */}
      {metrics.expectedReplyRate && metrics.linkedInReplyRate && (
        <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="text-xs font-medium text-muted-foreground mb-2">Projected Performance by Channel</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Mail className="w-3 h-3 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Cold Email</span>
              </div>
              <div className="space-y-1 text-[10px]">
                {metrics.expectedOpenRate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Open Rate</span>
                    <span className="font-medium">{metrics.expectedOpenRate}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reply Rate</span>
                  <span className="font-medium">{metrics.expectedReplyRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Replies</span>
                  <span className="font-medium">{metrics.expectedReplies}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Meetings Booked</span>
                  <span className="font-medium text-emerald-400">{metrics.expectedMeetings}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Linkedin className="w-3 h-3 text-sky-400" />
                <span className="text-xs font-medium text-sky-400">LinkedIn</span>
              </div>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connection Rate</span>
                  <span className="font-medium">{metrics.linkedInConnectionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reply Rate</span>
                  <span className="font-medium">{metrics.linkedInReplyRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connections</span>
                  <span className="font-medium">{metrics.linkedInConnections}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Meetings Booked</span>
                  <span className="font-medium text-sky-400">{metrics.linkedInMeetings || Math.round((metrics.linkedInReplies || 0) * 0.2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cold Email Campaign */}
      <Section
        title="Cold Email Campaign"
        icon={<Mail className="w-4 h-4 text-emerald-400" />}
        badge={`${coldEmail.sequences?.length || 0}-step sequence · ${coldEmail.prospectCount || 0} prospects`}
        badgeColor="bg-emerald-500/20 text-emerald-400"
        defaultOpen
      >
        <div className="space-y-4 pt-3">
          {/* Campaign Info */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {coldEmail.platform && (
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded capitalize">{coldEmail.platform}</span>
            )}
            {coldEmail.campaignName && (
              <span className="text-muted-foreground">{coldEmail.campaignName}</span>
            )}
          </div>

          {/* Prospect Criteria */}
          {coldEmail.prospectCriteria && (
            <div className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wide">Prospect Criteria</span>
              </div>
              <p className="text-xs text-muted-foreground">{coldEmail.prospectCriteria.icpMatch}</p>
              {coldEmail.prospectCriteria.sources?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {coldEmail.prospectCriteria.sources.map((src: string, idx: number) => (
                    <span key={idx} className="px-1.5 py-0.5 text-[10px] bg-muted rounded">{src}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Domain Setup */}
          {coldEmail.domains && (
            <div className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Globe className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] font-medium text-blue-400 uppercase tracking-wide">Sending Domains</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {coldEmail.domains.sendingDomains?.map((domain: string, idx: number) => (
                  <span key={idx} className="px-1.5 py-0.5 text-[10px] bg-blue-500/10 text-blue-400 rounded">{domain}</span>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground">{coldEmail.domains.warmupStatus}</div>
            </div>
          )}

          {/* Email Sequences */}
          {coldEmail.sequences?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-emerald-400 uppercase tracking-wide mb-2">
                Email Sequence ({coldEmail.sequences.length} steps)
              </div>
              <div className="space-y-3">
                {coldEmail.sequences.map((seq: any, idx: number) => (
                  <div key={idx} className="rounded-lg border border-border/50 overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-muted/20">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {seq.step}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">Subject: {seq.subject}</div>
                          {seq.subjectLineB && (
                            <div className="text-[10px] text-yellow-400 truncate">A/B: {seq.subjectLineB}</div>
                          )}
                          <div className="text-[10px] text-muted-foreground">
                            <Clock className="w-2.5 h-2.5 inline mr-0.5" />{seq.delay} — {seq.purpose}
                          </div>
                        </div>
                      </div>
                      <CopyButton text={`Subject: ${seq.subject}\n\n${seq.template}`} />
                    </div>
                    <div className="p-3 text-xs whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto bg-background/30">
                      {seq.template}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sending Schedule */}
          {coldEmail.sendingSchedule && (
            <div className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Sending Schedule</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-muted-foreground">Days: </span>
                  <span>{coldEmail.sendingSchedule.days?.join(', ')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Window: </span>
                  <span>{coldEmail.sendingSchedule.timeWindow}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Daily Limit: </span>
                  <span>{coldEmail.sendingSchedule.dailyLimit}/day</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Delay: </span>
                  <span>{coldEmail.sendingSchedule.delayBetweenSends}</span>
                </div>
              </div>
            </div>
          )}

          {/* A/B Tests */}
          {coldEmail.abTests?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-400 uppercase tracking-wide mb-2">
                <FlaskConical className="w-3 h-3" />
                A/B Tests ({coldEmail.abTests.length})
              </div>
              <div className="space-y-1.5">
                {coldEmail.abTests.map((test: any, idx: number) => (
                  <div key={idx} className="p-2 bg-yellow-500/5 rounded border border-yellow-500/10 text-xs">
                    <div className="font-medium text-yellow-400 text-[10px] mb-1">{test.variable}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-[10px]"><span className="text-muted-foreground">A: </span>{test.variantA}</div>
                      <div className="text-[10px]"><span className="text-muted-foreground">B: </span>{test.variantB}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personalization Fields */}
          {coldEmail.personalizationFields?.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Personalization Tokens</div>
              <div className="flex flex-wrap gap-1">
                {coldEmail.personalizationFields.map((field: string, idx: number) => (
                  <span key={idx} className="px-1.5 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 rounded font-mono">{field}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* LinkedIn Outreach */}
      <Section
        title="LinkedIn DM Automation"
        icon={<Linkedin className="w-4 h-4 text-sky-400" />}
        badge={`${linkedIn.sequences?.length || 0}-step sequence · ${linkedIn.targetProfiles || 0} profiles`}
        badgeColor="bg-sky-500/20 text-sky-400"
      >
        <div className="space-y-4 pt-3">
          {/* Connection Strategy */}
          {linkedIn.connectionStrategy && (
            <div className="p-2.5 bg-sky-500/5 rounded-lg border border-sky-500/10">
              <div className="text-[10px] font-medium text-sky-400 mb-1">Connection Strategy</div>
              <p className="text-xs text-muted-foreground">{linkedIn.connectionStrategy}</p>
            </div>
          )}

          {/* Targeting Criteria */}
          {linkedIn.targetingCriteria && (
            <div className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-1.5 mb-2">
                <Target className="w-3 h-3 text-sky-400" />
                <span className="text-[10px] font-medium text-sky-400 uppercase tracking-wide">Targeting Criteria</span>
              </div>
              <div className="space-y-2 text-xs">
                {linkedIn.targetingCriteria.jobTitles?.length > 0 && (
                  <div>
                    <span className="text-[10px] text-muted-foreground">Job Titles:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {linkedIn.targetingCriteria.jobTitles.map((title: string, idx: number) => (
                        <span key={idx} className="px-1.5 py-0.5 text-[10px] bg-sky-500/10 text-sky-400 rounded">{title}</span>
                      ))}
                    </div>
                  </div>
                )}
                {linkedIn.targetingCriteria.industries?.length > 0 && (
                  <div>
                    <span className="text-[10px] text-muted-foreground">Industries:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {linkedIn.targetingCriteria.industries.map((ind: string, idx: number) => (
                        <span key={idx} className="px-1.5 py-0.5 text-[10px] bg-purple-500/10 text-purple-400 rounded">{ind}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-muted-foreground">Company Size: </span>
                    <span>{linkedIn.targetingCriteria.companySize}</span>
                  </div>
                  {linkedIn.targetingCriteria.geography && (
                    <div>
                      <span className="text-muted-foreground">Geography: </span>
                      <span>{linkedIn.targetingCriteria.geography}</span>
                    </div>
                  )}
                </div>
                {linkedIn.targetingCriteria.additionalFilters?.length > 0 && (
                  <div>
                    <span className="text-[10px] text-muted-foreground">Buying Signals:</span>
                    <div className="space-y-0.5 mt-1">
                      {linkedIn.targetingCriteria.additionalFilters.map((filter: string, idx: number) => (
                        <div key={idx} className="text-[10px] flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-sky-400 flex-shrink-0" />
                          {filter}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Daily Limits */}
          {(linkedIn.dailyLimits || linkedIn.dailyLimit) && (
            <div className="flex flex-wrap gap-2 text-[10px]">
              <div className="px-2 py-1 bg-sky-500/10 rounded border border-sky-500/20">
                <UserPlus className="w-3 h-3 text-sky-400 inline mr-1" />
                {linkedIn.dailyLimits?.connectionRequests || linkedIn.dailyLimit || 25} connections/day
              </div>
              <div className="px-2 py-1 bg-sky-500/10 rounded border border-sky-500/20">
                <MessageSquare className="w-3 h-3 text-sky-400 inline mr-1" />
                {linkedIn.dailyLimits?.messages || 50} messages/day
              </div>
              {linkedIn.dailyLimits?.profileViews && (
                <div className="px-2 py-1 bg-sky-500/10 rounded border border-sky-500/20">
                  <Users className="w-3 h-3 text-sky-400 inline mr-1" />
                  {linkedIn.dailyLimits.profileViews} profile views/day
                </div>
              )}
            </div>
          )}

          {/* LinkedIn Sequences */}
          {linkedIn.sequences?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-sky-400 uppercase tracking-wide mb-2">
                DM Sequence ({linkedIn.sequences.length} steps)
              </div>
              <div className="space-y-2">
                {linkedIn.sequences.map((seq: any, idx: number) => (
                  <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                            {seq.step}
                          </span>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded ${STEP_COLORS[seq.type] || 'bg-muted text-muted-foreground'}`}>
                            {(seq.type || 'message').replace(/_/g, ' ').toUpperCase()}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            <Clock className="w-2.5 h-2.5 inline mr-0.5" />{seq.delay}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed whitespace-pre-line">{seq.message}</p>
                        {seq.triggerCondition && (
                          <div className="mt-1.5 text-[10px] text-yellow-400">
                            <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />
                            Trigger: {seq.triggerCondition}
                          </div>
                        )}
                      </div>
                      <CopyButton text={seq.message} />
                    </div>
                    <div className="mt-1.5 text-[10px] text-muted-foreground">
                      {seq.message.length} chars {seq.message.length > 300 ? '(over LinkedIn limit!)' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profile Optimization */}
          {linkedIn.profileOptimization && (
            <div className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
              <div className="text-[10px] font-medium text-sky-400 uppercase tracking-wide mb-2">Profile Optimization</div>
              <div className="space-y-2 text-xs">
                {linkedIn.profileOptimization.headline && (
                  <div>
                    <span className="text-[10px] text-muted-foreground">Headline:</span>
                    <p className="font-medium mt-0.5">{linkedIn.profileOptimization.headline}</p>
                  </div>
                )}
                {linkedIn.profileOptimization.about && (
                  <div>
                    <span className="text-[10px] text-muted-foreground">About:</span>
                    <p className="text-muted-foreground mt-0.5">{linkedIn.profileOptimization.about}</p>
                  </div>
                )}
                {linkedIn.profileOptimization.bannerCTA && (
                  <div>
                    <span className="text-[10px] text-muted-foreground">Banner CTA:</span>
                    <p className="text-blue-400 mt-0.5">{linkedIn.profileOptimization.bannerCTA}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Prospect List */}
      {prospects.length > 0 && (
        <Section
          title="Prospect List (Sample)"
          icon={<Users className="w-4 h-4 text-violet-400" />}
          badge={`${prospects.length} contacts`}
          badgeColor="bg-violet-500/20 text-violet-400"
        >
          <div className="pt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="text-left py-1.5 pr-3">Name</th>
                  <th className="text-left py-1.5 pr-3">Company</th>
                  <th className="text-left py-1.5 pr-3">Title</th>
                  <th className="text-left py-1.5 pr-3">Industry</th>
                  <th className="text-left py-1.5">Personalization</th>
                </tr>
              </thead>
              <tbody>
                {prospects.slice(0, 10).map((p: any, idx: number) => (
                  <tr key={idx} className="border-b border-border/30">
                    <td className="py-1.5 pr-3 font-medium">{p.firstName} {p.lastName}</td>
                    <td className="py-1.5 pr-3">{p.company}</td>
                    <td className="py-1.5 pr-3">
                      <span className="px-1.5 py-0.5 text-[10px] bg-violet-500/10 text-violet-400 rounded">{p.jobTitle}</span>
                    </td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{p.industry}</td>
                    <td className="py-1.5 text-[10px] text-muted-foreground max-w-[200px] truncate">{p.personalizationNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Compliance */}
      {coldEmail.complianceChecks?.length > 0 && (
        <Section
          title="Compliance & Safety"
          icon={<Shield className="w-4 h-4 text-green-400" />}
          badge={`${coldEmail.complianceChecks.length} checks`}
          badgeColor="bg-green-500/20 text-green-400"
        >
          <div className="space-y-1 pt-3">
            {coldEmail.complianceChecks.map((check: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                <span>{check}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Reasoning */}
      {d.reasoning && (
        <div className="p-3 sm:p-4 bg-gradient-to-r from-emerald-500/10 to-sky-500/10 rounded-lg border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">Outbound Strategy</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{d.reasoning}</p>
        </div>
      )}
    </div>
  );
}

export default OutboundOutreachOutput;
