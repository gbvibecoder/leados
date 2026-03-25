'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ImagePlus, Wand2, Download, Eye, Palette, Type, MousePointerClick,
  Smartphone, Monitor, Square, RectangleHorizontal, Sparkles, Loader2,
  ChevronRight, RotateCcw, Megaphone, Layers, Zap, ArrowRight,
  Instagram, Globe, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AdTemplate {
  id: string;
  name: string;
  description: string;
  category: 'hero' | 'feature' | 'social-proof' | 'cta' | 'comparison';
  bgStyle: string;
  accentColor: string;
  textColor: string;
  layout: 'centered' | 'split' | 'overlay';
}

interface AdConfig {
  headline: string;
  subheadline: string;
  ctaText: string;
  bodyText: string;
  brandName: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  format: 'square' | 'story' | 'landscape';
  template: string;
  imagePrompt: string;
  generatedImageUrl: string | null;
}

type FormatKey = 'square' | 'story' | 'landscape';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const AD_TEMPLATES: AdTemplate[] = [
  {
    id: 'dark-bold',
    name: 'Dark Bold',
    description: 'Dark background with bold orange accents — high impact',
    category: 'hero',
    bgStyle: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%)',
    accentColor: '#ff6b00',
    textColor: '#ffffff',
    layout: 'centered',
  },
  {
    id: 'clean-minimal',
    name: 'Clean Minimal',
    description: 'Light background with clean typography — professional feel',
    category: 'feature',
    bgStyle: 'linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%)',
    accentColor: '#ff6b00',
    textColor: '#1a1a1a',
    layout: 'split',
  },
  {
    id: 'gradient-glow',
    name: 'Gradient Glow',
    description: 'Dark gradient with glowing accents — tech-forward',
    category: 'hero',
    bgStyle: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
    accentColor: '#00f2ff',
    textColor: '#ffffff',
    layout: 'centered',
  },
  {
    id: 'split-compare',
    name: 'Split Compare',
    description: 'Before/after split layout — great for showing transformation',
    category: 'comparison',
    bgStyle: 'linear-gradient(90deg, #f5f5f5 0%, #f5f5f5 50%, #1a1a2e 50%, #1a1a2e 100%)',
    accentColor: '#ff6b00',
    textColor: '#ffffff',
    layout: 'split',
  },
  {
    id: 'social-trust',
    name: 'Social Trust',
    description: 'Warm tones with trust elements — builds credibility',
    category: 'social-proof',
    bgStyle: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b4e 100%)',
    accentColor: '#f59e0b',
    textColor: '#ffffff',
    layout: 'overlay',
  },
  {
    id: 'action-cta',
    name: 'Action CTA',
    description: 'Bold call-to-action focused — drives conversions',
    category: 'cta',
    bgStyle: 'linear-gradient(180deg, #0a0a1a 0%, #1e293b 100%)',
    accentColor: '#10b981',
    textColor: '#ffffff',
    layout: 'centered',
  },
];

const FORMAT_OPTIONS: { key: FormatKey; label: string; icon: React.ComponentType<{ className?: string }>; w: number; h: number }[] = [
  { key: 'square', label: '1:1 Feed', icon: Square, w: 1080, h: 1080 },
  { key: 'story', label: '9:16 Story', icon: Smartphone, w: 1080, h: 1920 },
  { key: 'landscape', label: '16:9 Banner', icon: Monitor, w: 1920, h: 1080 },
];

const ACCENT_PRESETS = ['#ff6b00', '#00f2ff', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#ef4444'];

const DEFAULT_CONFIG: AdConfig = {
  headline: 'Never Miss a Critical Update Again',
  subheadline: 'AI-powered automation for your business',
  ctaText: 'Get Started — Only $9',
  bodyText: 'Stop wasting hours on manual tracking. Our platform automates everything. Choose your keywords and get instant alerts.',
  brandName: 'LeadOS',
  accentColor: '#ff6b00',
  bgColor: '#0a0a1a',
  textColor: '#ffffff',
  format: 'square',
  template: 'dark-bold',
  imagePrompt: '',
  generatedImageUrl: null,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdCreatorPage() {
  const [config, setConfig] = useState<AdConfig>(DEFAULT_CONFIG);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'content' | 'style' | 'image'>('templates');
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');
  const [error, setError] = useState<string | null>(null);
  const [generationHistory, setGenerationHistory] = useState<string[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedTemplate = AD_TEMPLATES.find(t => t.id === config.template) || AD_TEMPLATES[0];

  const update = useCallback((partial: Partial<AdConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
    setError(null);
  }, []);

  const applyTemplate = useCallback((tpl: AdTemplate) => {
    update({
      template: tpl.id,
      accentColor: tpl.accentColor,
      bgColor: tpl.bgStyle.includes('#0a0a1a') || tpl.bgStyle.includes('#0d1117') || tpl.bgStyle.includes('#1a1a2e') ? '#0a0a1a' : '#ffffff',
      textColor: tpl.textColor,
    });
  }, [update]);

  /* ---- Fal image generation ---- */
  const generateImage = useCallback(async () => {
    if (!config.imagePrompt.trim()) {
      setError('Please enter an image prompt first');
      return;
    }
    setGenerating(true);
    setError(null);

    const fmt = FORMAT_OPTIONS.find(f => f.key === config.format)!;
    try {
      const res = await fetch('/api/ads/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: config.imagePrompt,
          width: fmt.w,
          height: fmt.h,
          style: 'photorealistic',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      if (data.imageUrl) {
        update({ generatedImageUrl: data.imageUrl });
        setGenerationHistory(prev => [data.imageUrl, ...prev].slice(0, 8));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Image generation failed');
    } finally {
      setGenerating(false);
    }
  }, [config.imagePrompt, config.format, update]);

  /* ---- Download as image ---- */
  const downloadAd = useCallback(async () => {
    const el = canvasRef.current;
    if (!el) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: null });
      const link = document.createElement('a');
      link.download = `ad-${config.template}-${config.format}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      setError('Download failed — please try right-clicking the preview to save');
    }
  }, [config.template, config.format]);

  /* ---- Format dimensions for preview ---- */
  const previewDims = (() => {
    switch (config.format) {
      case 'story': return { width: 320, height: 568 };
      case 'landscape': return { width: 560, height: 315 };
      default: return { width: 400, height: 400 };
    }
  })();

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.2), rgba(255,107,0,0.05))', border: '1px solid rgba(255,107,0,0.2)' }}>
            <Megaphone className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Ad Creator Studio</h1>
            <p className="text-sm text-gray-500">Create stunning marketing ads with AI-powered image generation</p>
          </div>
        </div>

        {/* Format selector + actions */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-2">
            {FORMAT_OPTIONS.map(f => (
              <button key={f.key} onClick={() => update({ format: f.key })}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  config.format === f.key
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-300'
                )}
                style={config.format === f.key ? {
                  background: 'rgba(255,107,0,0.1)',
                  border: '1px solid rgba(255,107,0,0.3)',
                  boxShadow: '0 0 20px rgba(255,107,0,0.1)',
                } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <f.icon className="h-4 w-4" />
                {f.label}
                <span className="text-[10px] text-gray-600">{f.w}x{f.h}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setPreviewMode(previewMode === 'edit' ? 'preview' : 'edit')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Eye className="h-4 w-4" />
              {previewMode === 'edit' ? 'Preview' : 'Edit'}
            </button>
            <button onClick={() => setConfig(DEFAULT_CONFIG)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button onClick={downloadAd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #ff6b00, #ff8533)', boxShadow: '0 4px 20px rgba(255,107,0,0.3)' }}
            >
              <Download className="h-4 w-4" />
              Download PNG
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-4 px-4 py-3 rounded-xl text-sm text-red-300 flex items-center justify-between"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">&times;</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main layout: sidebar controls + preview */}
      <div className="flex gap-6">
        {/* Left: Controls */}
        <div className="w-[380px] shrink-0">
          {/* Tabs */}
          <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {([
              { key: 'templates' as const, label: 'Templates', icon: Layers },
              { key: 'content' as const, label: 'Content', icon: Type },
              { key: 'style' as const, label: 'Style', icon: Palette },
              { key: 'image' as const, label: 'AI Image', icon: Wand2 },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  activeTab === tab.key ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                )}
                style={activeTab === tab.key ? {
                  background: 'rgba(255,107,0,0.1)',
                  border: '1px solid rgba(255,107,0,0.2)',
                } : {}}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="rounded-xl p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>

            {/* Templates tab */}
            {activeTab === 'templates' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 mb-2">Choose a template style inspired by high-converting ad designs</p>
                {AD_TEMPLATES.map(tpl => (
                  <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                    className={cn(
                      'w-full text-left rounded-xl p-3 transition-all group',
                      config.template === tpl.id ? 'ring-1' : 'hover:brightness-110'
                    )}
                    style={{
                      background: tpl.bgStyle,
                      border: config.template === tpl.id ? `2px solid ${tpl.accentColor}` : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: tpl.accentColor }} />
                          <span className="text-sm font-semibold" style={{ color: tpl.textColor }}>{tpl.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                            style={{ background: `${tpl.accentColor}20`, color: tpl.accentColor }}>
                            {tpl.category}
                          </span>
                        </div>
                        <p className="text-[11px] mt-1 opacity-60" style={{ color: tpl.textColor }}>{tpl.description}</p>
                      </div>
                      {config.template === tpl.id && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: tpl.accentColor }}>
                          <ChevronRight className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Content tab */}
            {activeTab === 'content' && (
              <div className="space-y-4">
                <FieldGroup label="Brand Name">
                  <input type="text" value={config.brandName} onChange={e => update({ brandName: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/40"
                    placeholder="Your brand" />
                </FieldGroup>
                <FieldGroup label="Headline">
                  <input type="text" value={config.headline} onChange={e => update({ headline: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/40"
                    placeholder="Main headline" />
                </FieldGroup>
                <FieldGroup label="Subheadline">
                  <input type="text" value={config.subheadline} onChange={e => update({ subheadline: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/40"
                    placeholder="Supporting text" />
                </FieldGroup>
                <FieldGroup label="Body Text">
                  <textarea value={config.bodyText} onChange={e => update({ bodyText: e.target.value })} rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/40 resize-none"
                    placeholder="Describe your offer..." />
                </FieldGroup>
                <FieldGroup label="CTA Button Text">
                  <input type="text" value={config.ctaText} onChange={e => update({ ctaText: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/40"
                    placeholder="Get Started Now" />
                </FieldGroup>
              </div>
            )}

            {/* Style tab */}
            {activeTab === 'style' && (
              <div className="space-y-4">
                <FieldGroup label="Accent Color">
                  <div className="flex gap-2 flex-wrap">
                    {ACCENT_PRESETS.map(c => (
                      <button key={c} onClick={() => update({ accentColor: c })}
                        className={cn('w-8 h-8 rounded-lg transition-all', config.accentColor === c && 'ring-2 ring-white ring-offset-2 ring-offset-gray-900')}
                        style={{ background: c }} />
                    ))}
                    <label className="w-8 h-8 rounded-lg border border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors relative overflow-hidden">
                      <Palette className="h-3.5 w-3.5 text-gray-500" />
                      <input type="color" value={config.accentColor} onChange={e => update({ accentColor: e.target.value })}
                        className="absolute inset-0 opacity-0 cursor-pointer" />
                    </label>
                  </div>
                </FieldGroup>
                <FieldGroup label="Background">
                  <div className="flex gap-2">
                    {['#0a0a1a', '#0d1117', '#1a1a2e', '#ffffff', '#f5f5f5', '#1e293b'].map(c => (
                      <button key={c} onClick={() => update({ bgColor: c, textColor: ['#ffffff', '#f5f5f5'].includes(c) ? '#1a1a1a' : '#ffffff' })}
                        className={cn('w-8 h-8 rounded-lg transition-all', config.bgColor === c && 'ring-2 ring-orange-400 ring-offset-2 ring-offset-gray-900')}
                        style={{ background: c, border: '1px solid rgba(255,255,255,0.1)' }} />
                    ))}
                  </div>
                </FieldGroup>
                <FieldGroup label="Text Color">
                  <div className="flex gap-2">
                    {['#ffffff', '#f5f5f5', '#e5e7eb', '#1a1a1a', '#374151'].map(c => (
                      <button key={c} onClick={() => update({ textColor: c })}
                        className={cn('w-8 h-8 rounded-lg transition-all flex items-center justify-center text-[10px] font-bold', config.textColor === c && 'ring-2 ring-orange-400 ring-offset-2 ring-offset-gray-900')}
                        style={{ background: c, border: '1px solid rgba(255,255,255,0.1)', color: c === '#ffffff' || c === '#f5f5f5' || c === '#e5e7eb' ? '#000' : '#fff' }}
                      >
                        Aa
                      </button>
                    ))}
                  </div>
                </FieldGroup>
              </div>
            )}

            {/* AI Image tab */}
            {activeTab === 'image' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,107,0,0.05)', border: '1px solid rgba(255,107,0,0.15)' }}>
                  <Sparkles className="h-4 w-4 text-orange-400 shrink-0" />
                  <p className="text-[11px] text-orange-300/80">Powered by Fal.ai — generates high-quality images for your ads</p>
                </div>

                <FieldGroup label="Image Prompt">
                  <textarea value={config.imagePrompt} onChange={e => update({ imagePrompt: e.target.value })} rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/40 resize-none"
                    placeholder="e.g. Professional workspace with laptop showing analytics dashboard, dark moody lighting, modern office..." />
                </FieldGroup>

                {/* Quick prompts */}
                <div>
                  <p className="text-[10px] text-gray-600 mb-2 uppercase tracking-wider">Quick Prompts</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Professional person using laptop in modern office, cinematic lighting',
                      'Smartphone showing app dashboard with analytics, dark background, product photography',
                      'Team celebrating success in glass-walled office, warm light, candid photo',
                      'Abstract tech background with glowing network connections, dark navy blue',
                      'Before and after comparison, messy desk vs clean digital dashboard, split view',
                      'Business growth chart going upward, 3D render, dark background with orange glow',
                    ].map((p, i) => (
                      <button key={i} onClick={() => update({ imagePrompt: p })}
                        className="text-[10px] px-2 py-1 rounded-md text-gray-400 hover:text-white transition-colors truncate max-w-full"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        {p.slice(0, 50)}...
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={generateImage} disabled={generating || !config.imagePrompt.trim()}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all',
                    generating ? 'opacity-60 cursor-wait' : 'hover:brightness-110',
                  )}
                  style={{
                    background: generating ? 'rgba(255,107,0,0.3)' : 'linear-gradient(135deg, #ff6b00, #ff8533)',
                    boxShadow: generating ? 'none' : '0 4px 20px rgba(255,107,0,0.3)',
                  }}
                >
                  {generating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating with Fal.ai...</>
                  ) : (
                    <><Wand2 className="h-4 w-4" /> Generate AI Image</>
                  )}
                </button>

                {/* Generation history */}
                {generationHistory.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-600 mb-2 uppercase tracking-wider">Recent Generations</p>
                    <div className="grid grid-cols-4 gap-2">
                      {generationHistory.map((url, i) => (
                        <button key={i} onClick={() => update({ generatedImageUrl: url })}
                          className={cn(
                            'aspect-square rounded-lg overflow-hidden transition-all hover:ring-2 hover:ring-orange-400',
                            config.generatedImageUrl === url && 'ring-2 ring-orange-400'
                          )}
                        >
                          <img src={url} alt={`Generated ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {config.generatedImageUrl && (
                  <button onClick={() => update({ generatedImageUrl: null })}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                    Remove current image
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex-1 flex flex-col items-center">
          <div className="sticky top-24">
            {/* Platform preview badges */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="flex items-center gap-1.5 text-[10px] text-gray-500 px-2 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Instagram className="h-3 w-3" /> Instagram / Facebook
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-gray-500 px-2 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Globe className="h-3 w-3" /> Google Display
              </span>
            </div>

            {/* Ad Preview Canvas */}
            <motion.div
              ref={canvasRef}
              layout
              className="rounded-2xl overflow-hidden relative shadow-2xl"
              style={{
                width: previewDims.width,
                height: previewDims.height,
                background: selectedTemplate.bgStyle,
                transition: 'width 0.3s ease, height 0.3s ease',
              }}
            >
              {/* Background image layer */}
              {config.generatedImageUrl && (
                <div className="absolute inset-0">
                  <img src={config.generatedImageUrl} alt="Ad background" className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{
                    background: config.bgColor === '#ffffff' || config.bgColor === '#f5f5f5'
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.7) 40%, rgba(255,255,255,0.9) 100%)'
                      : 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.85) 100%)',
                  }} />
                </div>
              )}

              {/* Content */}
              <div className="relative h-full flex flex-col justify-between p-8 z-10">
                {/* Top: Brand */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: config.accentColor, boxShadow: `0 4px 12px ${config.accentColor}40` }}>
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-bold tracking-wider" style={{ color: config.textColor }}>{config.brandName}</span>
                  </div>
                  {selectedTemplate.category === 'social-proof' && (
                    <div className="flex -space-x-2">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full border-2" style={{ background: `${config.accentColor}${20 + i * 20}`, borderColor: config.bgColor }} />
                      ))}
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold border-2"
                        style={{ background: config.accentColor, borderColor: config.bgColor, color: '#fff' }}>+99</div>
                    </div>
                  )}
                </div>

                {/* Middle: Headline */}
                <div className={cn('flex-1 flex flex-col justify-center', config.format === 'story' ? 'py-12' : 'py-6')}>
                  <h2 className={cn('font-extrabold leading-tight', config.format === 'story' ? 'text-3xl' : config.format === 'landscape' ? 'text-2xl' : 'text-2xl')}
                    style={{ color: config.textColor }}>
                    {config.headline.split(' ').map((word, i) => {
                      // Highlight key words with accent
                      const highlights = ['never', 'nie', 'gamechanger', 'software', 'automatisiert', 'critical', 'update', 'ai', 'stop', 'free', 'now', 'instant', 'boost', 'grow'];
                      const isHighlight = highlights.includes(word.toLowerCase().replace(/[^a-z]/g, ''));
                      return (
                        <span key={i}>
                          {isHighlight ? (
                            <span style={{ color: config.accentColor, textDecoration: 'underline', textDecorationThickness: '3px', textUnderlineOffset: '4px', textDecorationColor: `${config.accentColor}60` }}>
                              {word}
                            </span>
                          ) : word}{' '}
                        </span>
                      );
                    })}
                  </h2>

                  <p className={cn('mt-3 leading-relaxed opacity-80', config.format === 'story' ? 'text-base' : 'text-sm')}
                    style={{ color: config.textColor }}>
                    {config.subheadline}
                  </p>

                  {config.format !== 'landscape' && (
                    <p className="mt-4 text-xs leading-relaxed opacity-60" style={{ color: config.textColor }}>
                      {config.bodyText}
                    </p>
                  )}

                  {/* Feature pills - shown on some templates */}
                  {(selectedTemplate.category === 'feature' || selectedTemplate.category === 'hero') && config.format !== 'landscape' && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {['Automated', 'Real-time', 'AI-Powered'].map(tag => (
                        <span key={tag} className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                          style={{ background: `${config.accentColor}15`, color: config.accentColor, border: `1px solid ${config.accentColor}30` }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom: CTA */}
                <div>
                  {selectedTemplate.category === 'comparison' && (
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>Manual</span>
                      <ArrowRight className="h-3 w-3" style={{ color: config.accentColor }} />
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${config.accentColor}20`, color: config.accentColor }}>Automated</span>
                    </div>
                  )}

                  <button className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${config.accentColor}, ${config.accentColor}cc)`,
                      boxShadow: `0 8px 32px ${config.accentColor}40`,
                    }}
                  >
                    <MousePointerClick className="h-4 w-4" />
                    {config.ctaText}
                  </button>

                  {selectedTemplate.category === 'cta' && (
                    <p className="text-center text-[10px] mt-2 opacity-40" style={{ color: config.textColor }}>
                      Setup in minutes — no credit card required
                    </p>
                  )}
                </div>
              </div>

              {/* Decorative elements based on template */}
              {selectedTemplate.layout === 'centered' && !config.generatedImageUrl && (
                <>
                  <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 blur-3xl" style={{ background: config.accentColor }} />
                  <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-5 blur-2xl" style={{ background: config.accentColor }} />
                </>
              )}
            </motion.div>

            {/* Preview info */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <span className="text-[10px] text-gray-600">
                {FORMAT_OPTIONS.find(f => f.key === config.format)?.w} x {FORMAT_OPTIONS.find(f => f.key === config.format)?.h}px
              </span>
              <span className="text-[10px] text-gray-600">Template: {selectedTemplate.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}
