'use client';

import React, { useState } from 'react';
import {
  Megaphone,
  Mail,
  Linkedin,
  Video,
  Camera,
  Palette,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  MessageSquare,
  Zap,
  Eye,
} from 'lucide-react';

interface AdCopy {
  headline: string;
  description: string;
  targetKeyword?: string;
}

interface TripleHook {
  visual?: string;
  audio?: string;
  textOnScreen?: string;
}

interface MetaAd {
  primaryText: string;
  headline: string;
  description: string;
  targetAudience: string;
  emotionalDoorway?: string;
  hookType?: string;
  tripleHook?: TripleHook;
}

interface Hook {
  angle: string;
  hook: string;
  useCase: string;
  hookType?: string;
  tripleHook?: TripleHook;
}

interface EmailStep {
  step: number;
  delay: string;
  subject: string;
  body: string;
  purpose: string;
}

interface VideoScript {
  duration: string;
  format: string;
  hook: string;
  body?: string;
  cta?: string;
  story?: string;
  reframe?: string;
  close?: string;
  tripleHook?: TripleHook;
}

interface UGCBrief {
  type: string;
  description: string;
  talkingPoints: string[];
  emotionalDoorway?: string;
}

interface VisualBrief {
  concept: string;
  layout: string;
  imagery: string;
  textOverlay: string;
  muteTestText?: string;
}

interface ContentData {
  adCopies: {
    google: AdCopy[];
    meta: MetaAd[];
  };
  hooks: Hook[];
  emailSequence: EmailStep[];
  linkedInScripts: {
    connectionRequest: string;
    followUp1: string;
    followUp2: string;
  };
  videoAdScripts: VideoScript[];
  ugcBriefs: UGCBrief[];
  visualCreativeBriefs: VisualBrief[];
  reasoning?: string;
  confidence?: number;
}

interface Props {
  data?: ContentData | { data: ContentData } | any;
}

const ANGLE_COLORS: Record<string, string> = {
  pain: 'bg-red-500/20 text-red-400 border-red-500/30',
  curiosity: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'social-proof': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  urgency: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  contrarian: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

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

export function ContentCreativeOutput({ data }: Props) {
  // Unwrap nested data — agent output may be wrapped in {success, data: {...}} or {data: {data: {...}}}
  let rawData: ContentData = data?.data?.data || data?.data || data;

  // If still no adCopies/hooks, search one level deeper in case of extra wrapping
  if (rawData && !rawData.adCopies && !rawData.hooks) {
    const inner = (rawData as any)?.data;
    if (inner && (inner.adCopies || inner.hooks)) {
      rawData = inner;
    }
  }

  // Use data directly — translation is handled by the parent AgentOutput wrapper
  const displayData: ContentData = rawData;

  if (!displayData || (!displayData.adCopies && !displayData.hooks)) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No content generated yet. Run the Content & Creative Agent to produce marketing assets.
      </div>
    );
  }

  const totalAssets =
    (displayData.adCopies?.google?.length || 0) +
    (displayData.adCopies?.meta?.length || 0) +
    (displayData.hooks?.length || 0) +
    (displayData.emailSequence?.length || 0) +
    3 + // LinkedIn scripts (connection + 2 follow-ups)
    (displayData.videoAdScripts?.length || 0) +
    (displayData.ugcBriefs?.length || 0) +
    (displayData.visualCreativeBriefs?.length || 0);

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-pink-500" />
          <h3 className="font-semibold">Creative Asset Package</h3>
          <span className="px-2 py-0.5 text-xs bg-pink-500/20 text-pink-400 rounded-full">
            {totalAssets} assets
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!!displayData.confidence && (
            <span className="text-xs text-muted-foreground">
              Confidence: <span className="font-semibold text-green-400">{displayData.confidence}%</span>
            </span>
          )}
        </div>
      </div>

      {/* Asset Type Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
        {[
          { label: 'Google Ads', count: displayData.adCopies?.google?.length || 0, color: 'text-green-400' },
          { label: 'Meta Ads', count: displayData.adCopies?.meta?.length || 0, color: 'text-blue-400' },
          { label: 'Hooks', count: displayData.hooks?.length || 0, color: 'text-purple-400' },
          { label: 'Emails', count: displayData.emailSequence?.length || 0, color: 'text-orange-400' },
          { label: 'LinkedIn', count: 3, color: 'text-sky-400' },
          { label: 'Video', count: displayData.videoAdScripts?.length || 0, color: 'text-red-400' },
          { label: 'UGC', count: displayData.ugcBriefs?.length || 0, color: 'text-yellow-400' },
        ].map((item) => (
          <div key={item.label} className="p-2 bg-muted/30 rounded-lg text-center">
            <div className={`text-lg font-bold ${item.color}`}>{item.count}</div>
            <div className="text-[10px] text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>

      {/* 1. Ad Copies */}
      <Section
        title="Ad Copies"
        icon={<Megaphone className="w-4 h-4 text-green-400" />}
        badge={`${(displayData.adCopies?.google?.length || 0) + (displayData.adCopies?.meta?.length || 0)} ads`}
        badgeColor="bg-green-500/20 text-green-400"
        defaultOpen
      >
        <div className="space-y-4 pt-3">
          {/* Google Ads */}
          {displayData.adCopies?.google?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-green-400 uppercase tracking-wide mb-2">Google Ads</div>
              <div className="space-y-2">
                {displayData.adCopies.google.map((ad, idx) => (
                  <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-blue-400">{ad.headline}</div>
                        <p className="text-xs text-muted-foreground mt-1 break-words">{ad.description}</p>
                      </div>
                      <CopyButton text={`${ad.headline}\n${ad.description}`} />
                    </div>
                    {ad.targetKeyword && (
                      <div className="mt-2 flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">Keyword:</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded">{ad.targetKeyword}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta Ads */}
          {displayData.adCopies?.meta?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-2">Meta Ads</div>
              <div className="space-y-2">
                {displayData.adCopies.meta.map((ad, idx) => (
                  <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm">{ad.headline}</div>
                        <p className="text-xs text-muted-foreground mt-0.5 break-words">{ad.description}</p>
                      </div>
                      <CopyButton text={`${ad.headline}\n${ad.description}\n\n${ad.primaryText}`} />
                    </div>
                    <div className="mt-2 p-2 bg-background/50 rounded text-xs whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto">
                      {ad.primaryText}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{ad.targetAudience}</span>
                      </div>
                      {ad.emotionalDoorway && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-pink-500/10 text-pink-400 rounded border border-pink-500/20">
                          {ad.emotionalDoorway.replace(/_/g, ' ')}
                        </span>
                      )}
                      {ad.hookType && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded border border-purple-500/20">
                          {ad.hookType.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    {ad.tripleHook && (
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        {ad.tripleHook.visual && (
                          <div className="p-1.5 bg-blue-500/5 rounded text-[10px]">
                            <span className="font-medium text-blue-400">Visual:</span>{' '}
                            <span className="text-muted-foreground">{ad.tripleHook.visual}</span>
                          </div>
                        )}
                        {ad.tripleHook.audio && (
                          <div className="p-1.5 bg-green-500/5 rounded text-[10px]">
                            <span className="font-medium text-green-400">Audio:</span>{' '}
                            <span className="text-muted-foreground">{ad.tripleHook.audio}</span>
                          </div>
                        )}
                        {ad.tripleHook.textOnScreen && (
                          <div className="p-1.5 bg-yellow-500/5 rounded text-[10px]">
                            <span className="font-medium text-yellow-400">Mute Text:</span>{' '}
                            <span className="text-muted-foreground font-bold">{ad.tripleHook.textOnScreen}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* 2. Hooks & Angles */}
      {displayData.hooks?.length > 0 && (
        <Section
          title="Hooks & Angles"
          icon={<Zap className="w-4 h-4 text-purple-400" />}
          badge={`${displayData.hooks.length} hooks`}
          badgeColor="bg-purple-500/20 text-purple-400"
        >
          <div className="space-y-2 pt-3">
            {displayData.hooks.map((hook, idx) => (
              <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={`inline-block px-2 py-0.5 text-[10px] rounded-full border ${ANGLE_COLORS[hook.angle] || 'bg-muted text-muted-foreground'}`}>
                        {hook.angle.toUpperCase()}
                      </span>
                      {hook.hookType && (
                        <span className="inline-block px-2 py-0.5 text-[10px] rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {hook.hookType.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium leading-relaxed break-words">{hook.hook}</p>
                  </div>
                  <CopyButton text={hook.hook} />
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">Use: {hook.useCase}</div>
                {hook.tripleHook && (
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {hook.tripleHook.visual && (
                      <div className="p-1.5 bg-blue-500/5 rounded text-[10px]">
                        <span className="font-medium text-blue-400">Visual:</span>{' '}
                        <span className="text-muted-foreground">{hook.tripleHook.visual}</span>
                      </div>
                    )}
                    {hook.tripleHook.audio && (
                      <div className="p-1.5 bg-green-500/5 rounded text-[10px]">
                        <span className="font-medium text-green-400">Audio:</span>{' '}
                        <span className="text-muted-foreground">{hook.tripleHook.audio}</span>
                      </div>
                    )}
                    {hook.tripleHook.textOnScreen && (
                      <div className="p-1.5 bg-yellow-500/5 rounded text-[10px]">
                        <span className="font-medium text-yellow-400">Mute Text:</span>{' '}
                        <span className="text-muted-foreground font-bold">{hook.tripleHook.textOnScreen}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 3. Email Sequence */}
      {displayData.emailSequence?.length > 0 && (
        <Section
          title="Email Sequence"
          icon={<Mail className="w-4 h-4 text-orange-400" />}
          badge={`${displayData.emailSequence.length}-step`}
          badgeColor="bg-orange-500/20 text-orange-400"
        >
          <div className="space-y-3 pt-3">
            {displayData.emailSequence.map((email, idx) => (
              <div key={idx} className="rounded-lg border border-border/50 overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-muted/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {email.step}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">Subject: {email.subject}</div>
                      <div className="text-[10px] text-muted-foreground">{email.delay} — {email.purpose}</div>
                    </div>
                  </div>
                  <CopyButton text={`Subject: ${email.subject}\n\n${email.body}`} />
                </div>
                <div className="p-3 text-xs whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto bg-background/30">
                  {email.body}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 4. LinkedIn Scripts */}
      {displayData.linkedInScripts && (() => {
        // Handle both old format (connectionRequest/followUp1/followUp2)
        // and new format (message1/message2/message3 from linkedInDMSequence)
        const li = displayData.linkedInScripts as any;
        const messages = [
          { label: 'Connection Request', text: li.connectionRequest || li.message1?.text || li.message1 || '' },
          { label: 'Follow-Up 1 (Value)', text: li.followUp1 || li.message2?.text || li.message2 || '' },
          { label: 'Follow-Up 2 (Ask)', text: li.followUp2 || li.message3?.text || li.message3 || '' },
        ].filter(m => m.text);
        if (messages.length === 0) return null;
        return (
          <Section
            title="LinkedIn Scripts"
            icon={<Linkedin className="w-4 h-4 text-sky-400" />}
            badge={`${messages.length} messages`}
            badgeColor="bg-sky-500/20 text-sky-400"
          >
            <div className="space-y-2 pt-3">
              {messages.map((msg, idx) => (
                <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-medium text-sky-400 uppercase tracking-wide mb-1">{msg.label}</div>
                      <p className="text-xs leading-relaxed break-words">{msg.text}</p>
                    </div>
                    <CopyButton text={msg.text} />
                  </div>
                  <div className="mt-1.5 text-[10px] text-muted-foreground">
                    {msg.text.length} chars {msg.text.length > 300 ? '(over limit!)' : ''}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        );
      })()}

      {/* 5. Video Ad Scripts */}
      {displayData.videoAdScripts?.length > 0 && (
        <Section
          title="Video Ad Scripts"
          icon={<Video className="w-4 h-4 text-red-400" />}
          badge={`${displayData.videoAdScripts.length} scripts`}
          badgeColor="bg-red-500/20 text-red-400"
        >
          <div className="space-y-3 pt-3">
            {displayData.videoAdScripts.map((script, idx) => {
              // Support both old format (hook/body/cta) and new storytelling format (hook/story/reframe/close)
              const isNewFormat = !!(script.story || script.reframe || script.close);
              const copyText = isNewFormat
                ? `HOOK: ${script.hook}\n\nSTORY: ${script.story || ''}\n\nREFRAME + PRODUCT: ${script.reframe || ''}\n\nCLOSE: ${script.close || ''}`
                : `HOOK: ${script.hook}\n\nBODY: ${script.body || ''}\n\nCTA: ${script.cta || ''}`;
              return (
                <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded">{script.duration}</span>
                      <span className="text-xs text-muted-foreground">{script.format}</span>
                    </div>
                    <CopyButton text={copyText} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="p-2 bg-red-500/5 rounded border-l-2 border-red-500/50">
                      <div className="text-[10px] font-medium text-red-400 mb-0.5">HOOK (0-3s)</div>
                      <p className="text-xs leading-relaxed break-words">{script.hook}</p>
                    </div>
                    {isNewFormat ? (
                      <>
                        {script.story && (
                          <div className="p-2 bg-purple-500/5 rounded border-l-2 border-purple-500/50">
                            <div className="text-[10px] font-medium text-purple-400 mb-0.5">STORY (3-10s)</div>
                            <p className="text-xs leading-relaxed break-words">{script.story}</p>
                          </div>
                        )}
                        {script.reframe && (
                          <div className="p-2 bg-blue-500/5 rounded border-l-2 border-blue-500/50">
                            <div className="text-[10px] font-medium text-blue-400 mb-0.5">REFRAME + PRODUCT (10-22s)</div>
                            <p className="text-xs leading-relaxed break-words">{script.reframe}</p>
                          </div>
                        )}
                        {script.close && (
                          <div className="p-2 bg-green-500/5 rounded border-l-2 border-green-500/50">
                            <div className="text-[10px] font-medium text-green-400 mb-0.5">IDENTITY CLOSE (22-30s)</div>
                            <p className="text-xs leading-relaxed break-words">{script.close}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {script.body && (
                          <div className="p-2 bg-muted/20 rounded border-l-2 border-border">
                            <div className="text-[10px] font-medium text-muted-foreground mb-0.5">BODY</div>
                            <p className="text-xs leading-relaxed break-words">{script.body}</p>
                          </div>
                        )}
                        {script.cta && (
                          <div className="p-2 bg-green-500/5 rounded border-l-2 border-green-500/50">
                            <div className="text-[10px] font-medium text-green-400 mb-0.5">CTA</div>
                            <p className="text-xs leading-relaxed break-words">{script.cta}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {script.tripleHook && (
                    <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-border/30">
                      {script.tripleHook.visual && (
                        <div className="p-1.5 bg-blue-500/5 rounded text-[10px]">
                          <span className="font-medium text-blue-400">Visual:</span>{' '}
                          <span className="text-muted-foreground">{script.tripleHook.visual}</span>
                        </div>
                      )}
                      {script.tripleHook.audio && (
                        <div className="p-1.5 bg-green-500/5 rounded text-[10px]">
                          <span className="font-medium text-green-400">Audio:</span>{' '}
                          <span className="text-muted-foreground">{script.tripleHook.audio}</span>
                        </div>
                      )}
                      {script.tripleHook.textOnScreen && (
                        <div className="p-1.5 bg-yellow-500/5 rounded text-[10px]">
                          <span className="font-medium text-yellow-400">Mute Text:</span>{' '}
                          <span className="text-muted-foreground font-bold">{script.tripleHook.textOnScreen}</span>
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

      {/* 6. UGC Briefs */}
      {displayData.ugcBriefs?.length > 0 && (
        <Section
          title="UGC Briefs"
          icon={<Camera className="w-4 h-4 text-yellow-400" />}
          badge={`${displayData.ugcBriefs.length} briefs`}
          badgeColor="bg-yellow-500/20 text-yellow-400"
        >
          <div className="space-y-2 pt-3">
            {displayData.ugcBriefs.map((brief, idx) => (
              <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded">{brief.type}</span>
                  {brief.emotionalDoorway && (
                    <span className="px-2 py-0.5 text-[10px] bg-pink-500/10 text-pink-400 rounded border border-pink-500/20">
                      {brief.emotionalDoorway.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2 break-words">{brief.description}</p>
                <div className="space-y-1">
                  {brief.talkingPoints.map((point, pIdx) => (
                    <div key={pIdx} className="flex items-start gap-1.5 text-xs">
                      <MessageSquare className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 7. Visual Creative Briefs */}
      {displayData.visualCreativeBriefs?.length > 0 && (
        <Section
          title="Visual Creative Briefs"
          icon={<Palette className="w-4 h-4 text-pink-400" />}
          badge={`${displayData.visualCreativeBriefs.length} concepts`}
          badgeColor="bg-pink-500/20 text-pink-400"
        >
          <div className="space-y-2 pt-3">
            {displayData.visualCreativeBriefs.map((brief, idx) => (
              <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-2">
                <div className="font-medium text-sm">{brief.concept}</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-background/50 rounded">
                    <div className="text-[10px] font-medium text-pink-400 mb-0.5">Layout</div>
                    <p className="text-muted-foreground break-words">{brief.layout}</p>
                  </div>
                  <div className="p-2 bg-background/50 rounded">
                    <div className="text-[10px] font-medium text-purple-400 mb-0.5">Imagery</div>
                    <p className="text-muted-foreground break-words">{brief.imagery}</p>
                  </div>
                  <div className="p-2 bg-background/50 rounded">
                    <div className="text-[10px] font-medium text-blue-400 mb-0.5">Text Overlay</div>
                    <p className="text-muted-foreground break-words">{brief.textOverlay}</p>
                  </div>
                </div>
                {brief.muteTestText && (
                  <div className="mt-2 p-2 bg-yellow-500/5 rounded border border-yellow-500/20">
                    <div className="text-[10px] font-medium text-yellow-400 mb-0.5">Mute Test Text</div>
                    <p className="text-xs font-bold text-foreground">{brief.muteTestText}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Reasoning */}
      {displayData.reasoning && (
        <div className="p-3 sm:p-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-lg border border-pink-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-pink-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">Creative Strategy</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">{typeof displayData.reasoning === 'string' ? displayData.reasoning : JSON.stringify(displayData.reasoning)}</p>
        </div>
      )}
    </div>
  );
}

export default ContentCreativeOutput;
