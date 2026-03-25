'use client';

/** Safely coerce any value to a renderable string — prevents React error #31 */
function safeText(value: any, fallback = ''): string {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

import React, { useState, useEffect, useRef } from 'react';
import {
  Megaphone, Search, Target, DollarSign, TrendingUp, Users,
  ChevronDown, ChevronUp, Eye, Ban, ExternalLink, Sparkles,
  CheckCircle2, Rocket, ShieldCheck, AlertTriangle, Loader2,
  Copy, Check,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import CampaignForm from '@/components/meta/CampaignForm';
import CampaignProgress from '@/components/meta/CampaignProgress';
import { useMetaCampaign } from '@/hooks/useMetaCampaign';
import type { CampaignFormData, CallToAction } from '@/types/meta';

interface Props {
  data?: any;
}

// ── Reusable UI Components ──────────────────────────────────────────────────

function Section({
  title, icon, badge, badgeColor = 'bg-blue-500/20 text-blue-400',
  children, defaultOpen = false,
}: {
  title: string; icon: React.ReactNode; badge?: string;
  badgeColor?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full p-3 sm:p-4 flex items-center justify-between text-left hover:bg-accent/50 transition-colors">
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 hover:bg-accent rounded transition-colors flex-shrink-0" title="Copy">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
    </button>
  );
}

// ── Google Search Ad Preview (realistic SERP style) ─────────────────────────

function GoogleAdPreview({ adGroup, landingUrl, index }: { adGroup: any; landingUrl?: string; index: number }) {
  const headlines = adGroup.adCopy?.headlines || [];
  const descriptions = adGroup.adCopy?.descriptions || [];
  const url = landingUrl || 'leados.com';
  const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Sponsored label + URL */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Search className="w-3 h-3 text-gray-400" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-gray-800 font-medium truncate">{displayUrl}</div>
        </div>
        <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded ml-auto flex-shrink-0">Sponsored</span>
      </div>

      {/* Headline (clickable blue link) */}
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="text-[#1a0dab] text-[15px] font-medium hover:underline cursor-pointer leading-snug block mb-1">
        {headlines.slice(0, 3).join(' | ')}
      </a>

      {/* Description */}
      <p className="text-[12px] text-gray-600 leading-relaxed mb-2">
        {descriptions.slice(0, 2).join(' ')}
      </p>

      {/* Sitelink extensions (if available in ad group keywords) */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {adGroup.keywords?.slice(0, 4).map((kw: string, i: number) => (
          <span key={i} className="text-[11px] text-[#1a0dab] hover:underline cursor-pointer">{kw}</span>
        ))}
      </div>

      {/* Ad group label */}
      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[9px] text-gray-400 uppercase tracking-wider">Ad Group {index + 1}: {adGroup.theme || adGroup.name}</span>
        <CopyButton text={`${headlines.join(' | ')}\n${descriptions.join(' ')}`} />
      </div>
    </div>
  );
}

// ── Module-level image cache — persists across re-renders ────────────────────
const imageCache = new Map<string, string>();

// Generate image via FAL API
async function generateAdImage(prompt: string): Promise<string | null> {
  try {
    const res = await fetch('/api/ads/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, width: 1080, height: 1080, style: 'photorealistic' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.imageUrl || null;
  } catch {
    return null;
  }
}

// ── Industry-specific stock images keyed by category ──
// Each category has 6+ photos so each ad set gets a unique image
const INDUSTRY_IMAGES: Record<string, string[]> = {
  construction: [
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1080&h=1080&fit=crop&q=80', // construction site crane
    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1080&h=1080&fit=crop&q=80', // building under construction
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1080&h=1080&fit=crop&q=80', // architectural blueprints
    'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1080&h=1080&fit=crop&q=80', // hard hat on plans
    'https://images.unsplash.com/photo-1590644365607-1c5e64071a02?w=1080&h=1080&fit=crop&q=80', // modern building project
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&h=1080&fit=crop&q=80', // glass building exterior
  ],
  realestate: [
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1080&h=1080&fit=crop&q=80', // house keys
    'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1080&h=1080&fit=crop&q=80', // modern apartment
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1080&h=1080&fit=crop&q=80', // luxury home
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1080&h=1080&fit=crop&q=80', // house exterior
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1080&h=1080&fit=crop&q=80', // property
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1080&h=1080&fit=crop&q=80', // modern house
  ],
  finance: [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080&h=1080&fit=crop&q=80', // stock charts
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1080&h=1080&fit=crop&q=80', // financial documents
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080&h=1080&fit=crop&q=80', // business data
    'https://images.unsplash.com/photo-1638913662252-70efce1e60a7?w=1080&h=1080&fit=crop&q=80', // calculator & charts
    'https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=1080&h=1080&fit=crop&q=80', // banking
    'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1080&h=1080&fit=crop&q=80', // money/growth
  ],
  health: [
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1080&h=1080&fit=crop&q=80', // medical tech
    'https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=1080&h=1080&fit=crop&q=80', // healthcare
    'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=1080&h=1080&fit=crop&q=80', // wellness
    'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=1080&h=1080&fit=crop&q=80', // doctor
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1080&h=1080&fit=crop&q=80', // health app
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1080&h=1080&fit=crop&q=80', // hospital
  ],
  food: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1080&h=1080&fit=crop&q=80', // food plate
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1080&h=1080&fit=crop&q=80', // restaurant
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1080&h=1080&fit=crop&q=80', // pizza
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1080&h=1080&fit=crop&q=80', // food prep
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=1080&h=1080&fit=crop&q=80', // gourmet dish
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1080&h=1080&fit=crop&q=80', // fine dining
  ],
  education: [
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1080&h=1080&fit=crop&q=80', // classroom
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1080&h=1080&fit=crop&q=80', // learning
    'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=1080&h=1080&fit=crop&q=80', // student
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1080&h=1080&fit=crop&q=80', // teaching
    'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=1080&h=1080&fit=crop&q=80', // study
    'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1080&h=1080&fit=crop&q=80', // online learning
  ],
  ecommerce: [
    'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=1080&h=1080&fit=crop&q=80', // shopping
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1080&h=1080&fit=crop&q=80', // retail store
    'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1080&h=1080&fit=crop&q=80', // online shopping
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1080&h=1080&fit=crop&q=80', // shop
    'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1080&h=1080&fit=crop&q=80', // ecommerce
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1080&h=1080&fit=crop&q=80', // fashion shopping
  ],
  // Default: tech/SaaS — used when no industry match
  default: [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1080&h=1080&fit=crop&q=80', // dashboard analytics
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080&h=1080&fit=crop&q=80', // data on screens
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1080&h=1080&fit=crop&q=80', // professional at laptop
    'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1080&h=1080&fit=crop&q=80', // multi-screen data
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1080&h=1080&fit=crop&q=80', // team collaboration
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1080&h=1080&fit=crop&q=80', // code on laptop
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1080&h=1080&fit=crop&q=80', // business meeting
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1080&h=1080&fit=crop&q=80', // modern office
  ],
};

// Match product description keywords to an industry category
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  construction: ['construction', 'building', 'bauprojekt', 'bauvorhaben', 'bau', 'architect', 'infrastructure', 'contractor', 'municipality', 'municipal', 'kommunal', 'bebauung', 'stadtentwicklung', 'tender', 'blueprint', 'civil engineering', 'renovation', 'permit', 'baugenehmigung'],
  realestate: ['real estate', 'property', 'immobilien', 'housing', 'apartment', 'rental', 'mortgage', 'realtor', 'makler', 'wohnung', 'haus', 'grundstück'],
  finance: ['finance', 'banking', 'fintech', 'investment', 'accounting', 'insurance', 'finanz', 'versicherung', 'kredit', 'payment', 'trading', 'tax', 'steuer'],
  health: ['health', 'medical', 'healthcare', 'wellness', 'fitness', 'pharma', 'clinic', 'hospital', 'gesundheit', 'therapie', 'patient', 'doctor', 'dental'],
  food: ['food', 'restaurant', 'catering', 'delivery', 'recipe', 'kitchen', 'gastro', 'essen', 'kochen', 'café', 'bakery', 'nutrition'],
  education: ['education', 'learning', 'training', 'course', 'school', 'university', 'tutoring', 'bildung', 'schule', 'ausbildung', 'e-learning', 'academy'],
  ecommerce: ['ecommerce', 'e-commerce', 'shop', 'store', 'retail', 'marketplace', 'selling', 'product', 'fashion', 'online shop', 'handel'],
};

/** Detect the best industry category from product name + description */
function detectIndustry(productName: string, productDescription: string): string {
  const text = `${productName} ${productDescription}`.toLowerCase();
  let bestMatch = 'default';
  let bestScore = 0;

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = industry;
    }
  }

  return bestMatch;
}

/** Get a stock image URL matching the product's industry */
function getIndustryImage(productName: string, productDescription: string, index: number): string {
  const industry = detectIndustry(productName, productDescription);
  const images = INDUSTRY_IMAGES[industry] || INDUSTRY_IMAGES.default;
  return images[index % images.length];
}

// Build a rich, project-aware image prompt from all available creative data
function buildAdImagePrompt(
  brand: string,
  desc: string,
  styleIndex: number,
  creative?: any,
  audienceType?: string,
): string {
  const hook = creative?.hook || creative?.headline || '';
  const format = creative?.format || 'image';
  const cta = creative?.callToAction?.replace(/_/g, ' ') || '';

  // Core visual themes inspired by professional ad creatives:
  // dark backgrounds, product mockups, bold typography, accent colors
  const STYLE_TEMPLATES = [
    // Style 0: Product mockup on dark background (like NeoSearch phone mockup ads)
    `Professional social media advertisement for "${brand}". Show a smartphone or laptop displaying the "${brand}" app/dashboard with realistic UI elements. Dark navy-blue background with subtle orange accent lighting. Product mockup centered, clean composition. ${desc ? `The product: ${desc}.` : ''} Photorealistic, high-end marketing photography, no text overlay, sharp details.`,

    // Style 1: Professional at work with product (like NeoSearch office ads)
    `Professional person using "${brand}" on a modern laptop in a bright contemporary office. Screen shows the product dashboard/interface. ${desc ? `Context: ${desc}.` : ''} Warm natural lighting, shallow depth of field on the person, the screen is clearly visible. Corporate photography style, candid feel, no text overlay.`,

    // Style 2: Before/after split-screen concept (manual process vs automated)
    `Split-screen advertisement concept. Left side: cluttered desk with papers, documents, stress, dim lighting. Right side: clean modern workspace with a laptop showing "${brand}" dashboard, organized, bright. ${desc ? `Product solves: ${desc}.` : ''} Professional advertising photography, high contrast, no text overlay.`,

    // Style 3: Data visualization / dashboard hero (like tech SaaS ads)
    `Hero image for "${brand}" showing a floating holographic-style dashboard with charts, maps, and notification alerts. Dark blue-black background with glowing orange and white UI elements. ${desc ? `Dashboard context: ${desc}.` : ''} Futuristic but professional, cinematic lighting, 3D render style, no text overlay.`,

    // Style 4: Team/business impact scene
    `Business professionals in a modern conference room looking at a large screen displaying "${brand}" analytics dashboard. ${desc ? `The product: ${desc}.` : ''} Collaborative atmosphere, warm office lighting, glass walls, urban view outside. Corporate photography, natural poses, no text overlay.`,

    // Style 5: Mobile-first product showcase
    `Close-up product photography of a smartphone displaying "${brand}" app with notification alerts and real-time updates. Phone floating at slight angle against a dark gradient background with subtle orange glow. ${desc ? `App purpose: ${desc}.` : ''} Premium product photography, reflections on glass, no text overlay.`,
  ];

  let base = STYLE_TEMPLATES[styleIndex % STYLE_TEMPLATES.length];

  // Enrich with audience context
  if (audienceType === 'cold') {
    base += ' Eye-catching, awareness-focused composition, bold visual impact.';
  } else if (audienceType === 'warm') {
    base += ' Trust-building, show social proof elements, professional credibility.';
  } else if (audienceType === 'hot') {
    base += ' Action-oriented, urgency feel, conversion-focused framing.';
  }

  return base;
}

// ── Favicon Avatar — shows website favicon with letter-initial fallback ──────

// Favicon sources ordered by reliability
const FAVICON_SOURCES = (domain: string) => [
  `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
  `https://${domain}/favicon.ico`,
];

function FaviconAvatar({ domain, brand, size = 'md' }: { domain: string; brand: string; size?: 'sm' | 'md' }) {
  const [sourceIdx, setSourceIdx] = useState(0);
  const sources = domain ? FAVICON_SOURCES(domain) : [];

  const sizeClass = size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-9 h-9 text-sm';

  if (!domain || sourceIdx >= sources.length) {
    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white font-bold flex-shrink-0`}>
        {brand[0]?.toUpperCase() || '?'}
      </div>
    );
  }

  return (
    <img
      src={sources[sourceIdx]}
      alt={brand}
      className={`${sizeClass} rounded-full bg-white flex-shrink-0 object-contain ${size === 'sm' ? 'p-0' : 'p-0.5'}`}
      onError={() => setSourceIdx(prev => prev + 1)}
    />
  );
}

// ── CTA translations by language ─────────────────────────────────────────────

const CTA_TRANSLATIONS: Record<string, Record<string, string>> = {
  de: { 'LEARN MORE': 'MEHR ERFAHREN', 'SIGN UP': 'REGISTRIEREN', 'BOOK NOW': 'JETZT BUCHEN', 'CONTACT US': 'KONTAKT', 'GET QUOTE': 'ANGEBOT ERHALTEN', 'SHOP NOW': 'JETZT KAUFEN', 'DOWNLOAD': 'HERUNTERLADEN', 'GET OFFER': 'ANGEBOT SICHERN' },
  es: { 'LEARN MORE': 'MÁS INFORMACIÓN', 'SIGN UP': 'REGISTRARSE', 'BOOK NOW': 'RESERVAR AHORA', 'CONTACT US': 'CONTÁCTENOS', 'GET QUOTE': 'OBTENER COTIZACIÓN', 'SHOP NOW': 'COMPRAR AHORA', 'DOWNLOAD': 'DESCARGAR', 'GET OFFER': 'OBTENER OFERTA' },
  fr: { 'LEARN MORE': 'EN SAVOIR PLUS', 'SIGN UP': 'S\'INSCRIRE', 'BOOK NOW': 'RÉSERVER', 'CONTACT US': 'NOUS CONTACTER', 'GET QUOTE': 'OBTENIR UN DEVIS', 'SHOP NOW': 'ACHETER', 'DOWNLOAD': 'TÉLÉCHARGER', 'GET OFFER': 'OBTENIR L\'OFFRE' },
  it: { 'LEARN MORE': 'SCOPRI DI PIÙ', 'SIGN UP': 'ISCRIVITI', 'BOOK NOW': 'PRENOTA ORA', 'CONTACT US': 'CONTATTACI', 'GET QUOTE': 'RICHIEDI PREVENTIVO', 'SHOP NOW': 'ACQUISTA ORA', 'DOWNLOAD': 'SCARICA', 'GET OFFER': 'OTTIENI OFFERTA' },
  pt: { 'LEARN MORE': 'SAIBA MAIS', 'SIGN UP': 'CADASTRAR', 'BOOK NOW': 'RESERVAR AGORA', 'CONTACT US': 'FALE CONOSCO', 'GET QUOTE': 'SOLICITAR ORÇAMENTO', 'SHOP NOW': 'COMPRAR AGORA', 'DOWNLOAD': 'BAIXAR', 'GET OFFER': 'OBTER OFERTA' },
  nl: { 'LEARN MORE': 'MEER INFO', 'SIGN UP': 'AANMELDEN', 'BOOK NOW': 'NU BOEKEN', 'CONTACT US': 'CONTACT', 'GET QUOTE': 'OFFERTE AANVRAGEN', 'SHOP NOW': 'NU KOPEN', 'DOWNLOAD': 'DOWNLOADEN', 'GET OFFER': 'AANBIEDING' },
  hi: { 'LEARN MORE': 'और जानें', 'SIGN UP': 'साइन अप करें', 'BOOK NOW': 'अभी बुक करें', 'CONTACT US': 'संपर्क करें', 'GET QUOTE': 'कोटेशन प्राप्त करें', 'SHOP NOW': 'अभी खरीदें', 'DOWNLOAD': 'डाउनलोड', 'GET OFFER': 'ऑफर पाएं' },
};

function translateCTA(cta: string, lang: string): string {
  const normalized = cta.toUpperCase().replace(/_/g, ' ');
  const langKey = (lang || 'en').toLowerCase().split('-')[0];
  return CTA_TRANSLATIONS[langKey]?.[normalized] || normalized;
}

// ── Meta/Instagram Ad Preview (realistic feed style with AI image) ──────────

function MetaAdPreview({ adSet, campaignName, productName, productDescription, landingUrl, index, language }: {
  adSet: any; campaignName?: string; productName?: string; productDescription?: string; landingUrl?: string; index: number; language?: string;
}) {
  const creative = adSet.creatives?.[0];
  if (!creative) return null;

  const brand = (typeof productName === 'string' && productName) || (typeof campaignName === 'string' && campaignName) || 'Brand';
  const displayUrl = (landingUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
  const rawCta = (typeof creative.callToAction === 'string' ? creative.callToAction : '') || 'LEARN_MORE';
  const ctaLabel = translateCTA(rawCta, language || 'en');

  // Build product-specific image
  const rawDesc = productDescription || creative.description || '';
  const desc = typeof rawDesc === 'string' ? rawDesc : String(rawDesc ?? '');
  const styleIndex = index % 6;
  const audienceType = adSet.audience || adSet.type || '';
  const imagePrompt = creative.imagePrompt || buildAdImagePrompt(brand, desc, styleIndex, creative, audienceType);
  const cacheKey = `${brand}:${index}:${styleIndex}`;
  const stockUrl = getIndustryImage(brand, desc, index);

  const [imageUrl, setImageUrl] = useState<string | null>(() => imageCache.get(cacheKey) || null);
  const [imageLoading, setImageLoading] = useState(!imageCache.has(cacheKey));
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (imageCache.has(cacheKey)) {
      setImageUrl(imageCache.get(cacheKey)!);
      setImageLoading(false);
      return;
    }
    setImageLoading(true);
    generateAdImage(imagePrompt)
      .then((aiUrl) => {
        if (!mountedRef.current) return;
        const finalUrl = aiUrl || stockUrl;
        imageCache.set(cacheKey, finalUrl);
        setImageUrl(finalUrl);
        setImageLoading(false);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        imageCache.set(cacheKey, stockUrl);
        setImageUrl(stockUrl);
        setImageLoading(false);
      });
  }, [cacheKey, imagePrompt, stockUrl]);

  const primaryText = safeText(creative.primaryText) || safeText(creative.description) || safeText(adSet.name);
  const headline = safeText(creative.hook) || safeText(creative.headline) || safeText(creative.name);

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm max-w-sm">

      {/* ── Page header ── */}
      <div className="flex items-center gap-2.5 p-3">
        <FaviconAvatar domain={displayUrl} brand={brand} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-gray-900 truncate">{brand}</div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1">
            Sponsored · <Eye className="w-3 h-3 inline" />
          </div>
        </div>
      </div>

      {/* ── Ad creative image with text + CTA overlay ── */}
      <div className="relative overflow-hidden bg-gray-900" style={{ aspectRatio: '4/5' }}>
        {/* Background image */}
        {imageUrl ? (
          <img src={imageUrl} alt={headline}
            className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : imageLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <Loader2 className="w-6 h-6 text-white/30 animate-spin mb-2" />
            <span className="text-white/40 text-[11px]">Generating…</span>
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/85" />

        {/* Full-height text layout */}
        <div className="relative z-10 flex flex-col h-full p-4">

          {/* Top zone: Audience label + bold headline */}
          <div className="mb-auto">
            {audienceType && (
              <div className="text-[9px] text-orange-300 font-bold uppercase tracking-widest mb-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                {audienceType} – {safeText(adSet.name)}
              </div>
            )}
            <h3 className="text-white font-extrabold text-[20px] leading-[1.2] drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
              {(() => {
                const words = headline.split(' ');
                if (words.length >= 4) {
                  const mid = Math.floor(words.length / 3);
                  const end = Math.min(mid + Math.ceil(words.length / 3), words.length);
                  return (
                    <>
                      {words.slice(0, mid).join(' ')}{' '}
                      <span className="text-orange-400 italic font-black">{words.slice(mid, end).join(' ')}</span>
                      {end < words.length ? ` ${words.slice(end).join(' ')}` : ''}
                    </>
                  );
                }
                return headline;
              })()}
            </h3>
          </div>

          {/* Middle zone: Description text with frosted glass backdrop */}
          <div className="my-3 bg-black/50 backdrop-blur-md rounded-lg p-3 border border-white/10">
            <p className="text-white text-[13px] leading-relaxed line-clamp-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              {primaryText}
            </p>
          </div>

          {/* Bottom zone: CTA + brand */}
          <div className="mt-auto flex items-end justify-between">
            <div>
              <div className="inline-block px-5 py-2 bg-orange-500 text-white text-[12px] font-bold rounded cursor-pointer uppercase tracking-wide shadow-[0_2px_12px_rgba(249,115,22,0.4)]">
                {ctaLabel}
              </div>
              {displayUrl && (
                <div className="text-white/50 text-[10px] mt-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{displayUrl}</div>
              )}
            </div>
            {/* Brand mark in bottom-right */}
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded px-2 py-1 border border-white/10">
              <FaviconAvatar domain={displayUrl} brand={brand} size="sm" />
              <span className="text-white/90 text-[10px] font-semibold">{brand.split(' ')[0]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar: URL + headline + CTA ── */}
      <div className="p-3 flex items-center justify-between border-t border-gray-100">
        <div className="min-w-0 mr-3">
          <div className="text-[10px] text-gray-500 truncate">{displayUrl}</div>
          <div className="text-[12px] font-semibold text-gray-900 truncate">{safeText(creative.headline) || safeText(creative.name)}</div>
        </div>
        <a href={landingUrl} target="_blank" rel="noopener noreferrer"
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded flex-shrink-0 transition-colors cursor-pointer">
          {ctaLabel}
        </a>
      </div>

      {/* ── Creative label ── */}
      <div className="px-3 py-1.5 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[9px] text-gray-400 uppercase tracking-wider">
          Creative {index + 1}: {safeText(adSet.audience) || safeText(adSet.name)}
        </span>
        <CopyButton text={`${headline}\n\n${primaryText}\n\nCTA: ${ctaLabel}`} />
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

// Map agent CTA values to the form's supported values
function mapCTA(agentCta?: string): CallToAction {
  const map: Record<string, CallToAction> = {
    'LEARN_MORE': 'LEARN_MORE', 'SIGN_UP': 'SIGN_UP', 'CONTACT_US': 'CONTACT_US',
    'GET_QUOTE': 'GET_QUOTE', 'GET_OFFER': 'GET_QUOTE', 'BOOK_NOW': 'CONTACT_US',
  };
  return map[agentCta || ''] || 'LEARN_MORE';
}

export function PaidTrafficOutput({ data }: Props) {
  const d = data?.data || data;
  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<any>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Meta campaign inline form state
  const [showMetaForm, setShowMetaForm] = useState(false);
  const metaCampaign = useMetaCampaign();

  if (!d || (!d.googleAds && !d.metaAds)) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No campaign data yet. Run the Paid Traffic Agent to set up Google & Meta campaigns.
      </div>
    );
  }

  const googleAds = d.googleAds || {};
  const metaAds = d.metaAds || {};
  const budget = d.budgetAllocation || {};
  const projections = d.projections || {};

  const totalKeywords = googleAds.keywords?.length || 0;
  const totalAdGroups = googleAds.adGroups?.length || 0;
  const totalAudiences = metaAds.audiences?.length || 0;
  const totalAdSets = metaAds.adSets?.length || 0;
  const totalCreatives = metaAds.adSets?.reduce((sum: number, s: any) => sum + (s.creatives?.length || 0), 0) || 0;

  const isApprovalPending = d._approvalRequired && d._approvalStatus === 'pending' && !launchResult;
  const isLaunched = launchResult?.success || d._approvalStatus === 'launched';
  const googleLive = launchResult?.results?.google?.launched || !!googleAds._createdInGoogleAds;
  const metaLive = launchResult?.results?.meta?.launched || !!metaAds._createdInMeta;

  const handleLaunch = async () => {
    setLaunching(true);
    setLaunchError(null);
    try {
      const res = await apiFetch('/api/agents/paid-traffic/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignPlan: d }),
      });
      const result = await res.json();
      if (result.success) {
        setLaunchResult(result);
      } else {
        setLaunchError(result.error || 'Launch failed');
      }
    } catch (err: any) {
      setLaunchError(err.message || 'Network error');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-cyan-500" />
          <h3 className="font-semibold">Paid Traffic Campaigns</h3>
          <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">2 channels</span>
        </div>
        {!!d.confidence && (
          <span className="text-xs text-muted-foreground">
            Confidence: <span className="font-semibold text-green-400">{d.confidence}%</span>
          </span>
        )}
      </div>

      {/* ═══ APPROVAL BANNER ═══ */}
      {isApprovalPending && !showMetaForm && metaCampaign.step === 'idle' && (
        <div className="p-4 rounded-xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h4 className="font-semibold text-amber-300">Campaign Plan Ready — Review & Approve</h4>
          </div>
          <p className="text-xs text-amber-200/70 mb-4">
            Review the ad campaigns below. Click "Configure & Launch Meta Ads" to set targeting, budget, and schedule before going live.
          </p>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowMetaForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-blue-900/20">
              <Rocket className="w-4 h-4" /> Configure & Launch Meta Ads
            </button>
          </div>
          {launchError && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" /> {launchError}
            </div>
          )}
        </div>
      )}

      {/* ═══ INLINE META CAMPAIGN FORM ═══ */}
      {showMetaForm && metaCampaign.step === 'idle' && (() => {
        const firstAdSet = metaAds.adSets?.[0];
        const firstCreative = firstAdSet?.creatives?.[0];
        const prefill: Partial<CampaignFormData> = {
          campaignName: metaAds.campaignName || d._productName || '',
          objective: 'OUTCOME_LEADS',
          adHeadline: firstCreative?.headline || firstCreative?.name || '',
          adBody: firstCreative?.primaryText || firstCreative?.hook || '',
          destinationUrl: d._landingUrl || '',
          callToAction: mapCTA(firstCreative?.callToAction),
          placements: (metaAds.placements || ['facebook_feed', 'instagram_feed', 'instagram_stories']).map((p: string) =>
            p.toLowerCase().replace(/\s+/g, '_')
          ),
        };
        return (
          <div className="rounded-xl border-2 border-blue-500/30 bg-gradient-to-b from-blue-500/5 to-transparent p-4">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-blue-400" />
              <h4 className="font-semibold text-blue-300">Configure Meta Ads Campaign</h4>
            </div>
            <p className="text-xs text-blue-200/60 mb-4">
              Ad creative is pre-filled from the agent. Set your targeting, budget, and schedule below.
            </p>
            <CampaignForm
              initialData={prefill}
              submitLabel="Launch Meta Campaign"
              isLoading={false}
              onCancel={() => setShowMetaForm(false)}
              onSubmit={(formData) => {
                metaCampaign.startCampaign(formData);
              }}
            />
          </div>
        );
      })()}

      {/* ═══ META CAMPAIGN PROGRESS ═══ */}
      {metaCampaign.step !== 'idle' && metaCampaign.step !== 'live' && (
        <div className="rounded-xl border-2 border-blue-500/30 bg-gradient-to-b from-blue-500/5 to-transparent p-4">
          <CampaignProgress
            step={metaCampaign.step}
            ids={metaCampaign.ids}
            error={metaCampaign.error}
            onActivate={() => metaCampaign.activateCampaign()}
            onReset={() => { metaCampaign.reset(); setShowMetaForm(false); }}
          />
        </div>
      )}

      {/* ═══ META CAMPAIGN LIVE ═══ */}
      {metaCampaign.step === 'live' && (
        <div className="p-4 bg-green-500/10 border-2 border-green-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-sm font-semibold text-green-400">Meta Campaign is Live!</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mt-2">
            {metaCampaign.ids.campaign_id && (
              <div className="text-muted-foreground">Campaign: <span className="text-green-400">{metaCampaign.ids.campaign_id}</span></div>
            )}
            {metaCampaign.ids.adset_id && (
              <div className="text-muted-foreground">Ad Set: <span className="text-green-400">{metaCampaign.ids.adset_id}</span></div>
            )}
            {metaCampaign.ids.ad_id && (
              <div className="text-muted-foreground">Ad: <span className="text-green-400">{metaCampaign.ids.ad_id}</span></div>
            )}
          </div>
        </div>
      )}

      {/* ═══ LAUNCHED SUCCESS BANNER ═══ */}
      {isLaunched && (
        <div className="p-4 bg-green-500/10 border-2 border-green-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-sm font-semibold text-green-400">Campaigns Launched Successfully</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {(launchResult?.results?.google?.launched || googleLive) && (
              <div className="flex items-center gap-2 p-2 bg-green-500/5 rounded border border-green-500/10">
                <Search className="w-3.5 h-3.5 text-green-400" />
                <div>
                  <span className="font-medium text-green-400">Google Ads</span>
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded">ENABLED</span>
                  {launchResult?.results?.google?.campaignId && (
                    <div className="text-muted-foreground mt-0.5">ID: {launchResult.results.google.campaignId}</div>
                  )}
                  {launchResult?.results?.google?.adGroups?.length > 0 && (
                    <div className="text-muted-foreground">{launchResult.results.google.adGroups.length} ad groups live</div>
                  )}
                </div>
              </div>
            )}
            {(launchResult?.results?.meta?.launched || metaLive) && (
              <div className="flex items-center gap-2 p-2 bg-blue-500/5 rounded border border-blue-500/10">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <div>
                  <span className="font-medium text-blue-400">Meta Ads</span>
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 rounded">ACTIVE</span>
                  {launchResult?.results?.meta?.campaignId && (
                    <div className="text-muted-foreground mt-0.5">ID: {launchResult.results.meta.campaignId}</div>
                  )}
                  {launchResult?.results?.meta?.adSets?.length > 0 && (
                    <div className="text-muted-foreground">{launchResult.results.meta.adSets.length} ad sets live</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ AD PREVIEWS (always shown — highlighted when approval pending) ═══ */}
      {(googleAds.adGroups?.length > 0 || metaAds.adSets?.length > 0) && (
        <Section title={isApprovalPending ? 'Ad Previews — Review Before Launch' : 'Ad Previews'}
          icon={<Eye className="w-4 h-4 text-purple-400" />}
          badge={isApprovalPending ? 'Awaiting approval' : `${totalAdGroups + totalAdSets} ads`}
          badgeColor={isApprovalPending ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}
          defaultOpen={isApprovalPending}>
          <div className="space-y-6 pt-3">
            {/* Google Search Ad Previews */}
            {googleAds.adGroups?.length > 0 && (
              <div>
                <div className="text-xs font-medium text-green-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" /> Google Search Ads ({googleAds.adGroups.length})
                </div>
                <div className="space-y-3">
                  {googleAds.adGroups.map((ag: any, idx: number) => (
                    <GoogleAdPreview key={idx} adGroup={ag} landingUrl={d._landingUrl} index={idx} />
                  ))}
                </div>
              </div>
            )}

            {/* Meta / Instagram Ad Previews */}
            {metaAds.adSets?.length > 0 && (
              <div>
                <div className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-3 mt-2 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Meta / Instagram Ads ({metaAds.adSets.reduce((s: number, as_: any) => s + (as_.creatives?.length || 0), 0)} creatives)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {metaAds.adSets.map((adSet: any, idx: number) => (
                    <MetaAdPreview key={idx} adSet={adSet} campaignName={metaAds.campaignName}
                      productName={d._productName} productDescription={d._productDescription} landingUrl={d._landingUrl} index={idx} language={d._language} />
                  ))}
                </div>
              </div>
            )}

            {/* Landing URL info */}
            {d._landingUrl && (
              <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg border border-border/50 text-xs">
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span className="text-muted-foreground">All ads redirect to:</span>
                <a href={d._landingUrl} target="_blank" rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline truncate">{d._landingUrl}</a>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Projections Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="p-2.5 sm:p-3 rounded-lg border bg-green-500/5 border-green-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[10px] sm:text-xs text-green-400/80 font-medium uppercase tracking-wide">Budget</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-green-400">${(budget.totalMonthlyBudget || d.totalMonthlyBudget || 0).toLocaleString()}</span>
          <div className="text-[10px] text-muted-foreground mt-0.5">/month</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-blue-500/5 border-blue-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] sm:text-xs text-blue-400/80 font-medium uppercase tracking-wide">Est. CPL</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-blue-400">${projections.estimatedCPL || d.estimatedCPL || '—'}</span>
          <div className="text-[10px] text-muted-foreground mt-0.5">Cost Per Lead</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-purple-500/5 border-purple-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] sm:text-xs text-purple-400/80 font-medium uppercase tracking-wide">Est. Leads</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-purple-400">{(projections.estimatedLeadsPerMonth || d.estimatedLeadsPerMonth || 0).toLocaleString()}</span>
          <div className="text-[10px] text-muted-foreground mt-0.5">/month</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-orange-500/5 border-orange-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] sm:text-xs text-orange-400/80 font-medium uppercase tracking-wide">Est. ROAS</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-orange-400">{projections.estimatedROAS || 0}x</span>
          <div className="text-[10px] text-muted-foreground mt-0.5">Return on Ad Spend</div>
        </div>
      </div>

      {/* Budget Split */}
      {budget.google != null && budget.meta != null && (
        <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="text-xs font-medium text-muted-foreground mb-2">Budget Allocation</div>
          <div className="flex items-center gap-0 h-3 rounded-full overflow-hidden bg-muted">
            <div className="h-full bg-green-500 rounded-l-full transition-all" style={{ width: `${budget.google}%` }} />
            <div className="h-full bg-blue-500 rounded-r-full transition-all" style={{ width: `${budget.meta}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
            <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Google {budget.google}% (${Math.round((budget.totalMonthlyBudget || 0) * budget.google / 100).toLocaleString()}/mo)</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />Meta {budget.meta}% (${Math.round((budget.totalMonthlyBudget || 0) * budget.meta / 100).toLocaleString()}/mo)</span>
          </div>
        </div>
      )}

      {/* ═══ GOOGLE ADS DETAILS ═══ */}
      <Section title="Google Ads Campaign" icon={<Search className="w-4 h-4 text-green-400" />}
        badge={`${totalKeywords} keywords · ${totalAdGroups} ad groups`} badgeColor="bg-green-500/20 text-green-400" defaultOpen>
        <div className="space-y-4 pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded">{googleAds.campaignName}</span>
            {googleAds.dailyBudget > 0 && <span className="text-muted-foreground">${googleAds.dailyBudget}/day</span>}
            {googleAds.biddingStrategy && <><span className="text-muted-foreground">·</span><span className="text-muted-foreground">{googleAds.biddingStrategy}</span></>}
          </div>

          {/* Keywords Table */}
          {googleAds.keywords?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-green-400 uppercase tracking-wide mb-2">Keywords ({googleAds.keywords.length})</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="text-left py-1.5 pr-3">Keyword</th>
                      <th className="text-left py-1.5 pr-3">Match</th>
                      <th className="text-right py-1.5 pr-3">CPC</th>
                      <th className="text-right py-1.5 pr-3">Vol/mo</th>
                      <th className="text-left py-1.5">Intent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {googleAds.keywords.slice(0, 12).map((kw: any, idx: number) => (
                      <tr key={idx} className="border-b border-border/30">
                        <td className="py-1.5 pr-3 font-medium max-w-xs break-words">{kw.keyword}</td>
                        <td className="py-1.5 pr-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            kw.matchType === 'exact' ? 'bg-green-500/20 text-green-400' :
                            kw.matchType === 'phrase' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-orange-500/20 text-orange-400'
                          }`}>{kw.matchType}</span>
                        </td>
                        <td className="py-1.5 pr-3 text-right text-green-400">{kw.estimatedCPC > 0 ? `$${kw.estimatedCPC}` : '—'}</td>
                        <td className="py-1.5 pr-3 text-right">{kw.monthlySearchVolume > 0 ? kw.monthlySearchVolume?.toLocaleString() : '—'}</td>
                        <td className="py-1.5">
                          <span className={`text-[10px] ${
                            kw.intent === 'high' ? 'text-red-400' : kw.intent === 'medium' ? 'text-yellow-400' : 'text-muted-foreground'
                          }`}>{kw.intent || '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ad Groups */}
          {googleAds.adGroups?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-green-400 uppercase tracking-wide mb-2">Ad Groups ({googleAds.adGroups.length})</div>
              <div className="space-y-2">
                {googleAds.adGroups.map((ag: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-sm break-words">{ag.name}</div>
                      {ag.adCopy && <CopyButton text={`${ag.adCopy.headlines?.join(' | ')}\n${ag.adCopy.descriptions?.join('\n')}`} />}
                    </div>
                    {ag.theme && <div className="text-[10px] text-muted-foreground mb-2 break-words">{ag.theme}</div>}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {ag.keywords?.map((kw: string, kIdx: number) => (
                        <span key={kIdx} className="px-1.5 py-0.5 text-[10px] bg-green-500/10 text-green-400 rounded">{kw}</span>
                      ))}
                    </div>
                    {ag.adCopy && (
                      <div className="space-y-1 text-xs">
                        {ag.adCopy.headlines?.map((h: string, hIdx: number) => (
                          <div key={hIdx} className="text-blue-400 font-medium">{h}</div>
                        ))}
                        {ag.adCopy.descriptions?.map((desc: string, dIdx: number) => (
                          <div key={dIdx} className="text-muted-foreground break-words">{desc}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Negative Keywords */}
          {googleAds.negativeKeywords?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-red-400 uppercase tracking-wide mb-2">
                <Ban className="w-3 h-3" /> Negative Keywords ({googleAds.negativeKeywords.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {googleAds.negativeKeywords.map((nk: string, idx: number) => (
                  <span key={idx} className="px-1.5 py-0.5 text-[10px] bg-red-500/10 text-red-400 rounded">{nk}</span>
                ))}
              </div>
            </div>
          )}

          {/* Extensions */}
          {googleAds.extensions && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {googleAds.extensions.sitelinks?.length > 0 && (
                <div className="p-2 bg-muted/20 rounded border border-border/30">
                  <div className="text-[10px] font-medium text-muted-foreground mb-1">Sitelinks</div>
                  {googleAds.extensions.sitelinks.map((sl: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1 text-xs text-blue-400">
                      <ExternalLink className="w-3 h-3" /> {sl.text}
                    </div>
                  ))}
                </div>
              )}
              {googleAds.extensions.callouts?.length > 0 && (
                <div className="p-2 bg-muted/20 rounded border border-border/30">
                  <div className="text-[10px] font-medium text-muted-foreground mb-1">Callouts</div>
                  <div className="flex flex-wrap gap-1">
                    {googleAds.extensions.callouts.map((c: string, idx: number) => (
                      <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conversion Tracking */}
          {googleAds.conversionTracking && (
            <div className="p-2 bg-green-500/5 rounded border border-green-500/10 text-xs">
              <div className="text-[10px] font-medium text-green-400 mb-1">Conversion Tracking</div>
              <div className="text-muted-foreground">{googleAds.conversionTracking.trackingMethod}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {googleAds.conversionTracking.conversionActions?.map((a: string, idx: number) => (
                  <span key={idx} className="px-1.5 py-0.5 text-[10px] bg-green-500/10 text-green-400 rounded">{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ═══ META ADS DETAILS ═══ */}
      <Section title="Meta Ads Campaign" icon={<Eye className="w-4 h-4 text-blue-400" />}
        badge={`${totalAudiences} audiences · ${totalCreatives} creatives`} badgeColor="bg-blue-500/20 text-blue-400">
        <div className="space-y-4 pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">{metaAds.campaignName}</span>
            {metaAds.dailyBudget > 0 && <span className="text-muted-foreground">${metaAds.dailyBudget}/day</span>}
          </div>

          {/* Audiences */}
          {metaAds.audiences?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-2">Audiences ({metaAds.audiences.length})</div>
              <div className="space-y-2">
                {metaAds.audiences.map((aud: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                        aud.type === 'cold' ? 'bg-blue-500/20 text-blue-400' :
                        aud.type === 'warm' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>{safeText(aud.type).toUpperCase()}</span>
                      <span className="font-medium text-sm">{aud.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground break-words">{aud.targeting}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ad Sets */}
          {metaAds.adSets?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-2">Ad Sets ({metaAds.adSets.length})</div>
              <div className="space-y-2">
                {metaAds.adSets.map((adSet: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{adSet.name}</span>
                      {adSet.dailyBudget > 0 && <span className="text-[10px] text-muted-foreground">${adSet.dailyBudget}/day</span>}
                    </div>
                    <div className="space-y-1">
                      {adSet.creatives?.map((cr: any, cIdx: number) => (
                        <div key={cIdx} className="flex items-start gap-2 p-1.5 bg-background/50 rounded text-xs">
                          <span className={`px-1.5 py-0.5 text-[10px] rounded flex-shrink-0 ${
                            cr.format === 'video' ? 'bg-red-500/20 text-red-400' :
                            cr.format === 'carousel' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>{cr.format}</span>
                          <div className="min-w-0">
                            <div className="font-medium text-[10px]">{cr.name}</div>
                            <p className="text-[10px] text-muted-foreground break-words">{cr.hook}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Placements & Pixel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {metaAds.placements?.length > 0 && (
              <div className="p-2 bg-muted/20 rounded border border-border/30">
                <div className="text-[10px] font-medium text-muted-foreground mb-1">Placements</div>
                <div className="flex flex-wrap gap-1">
                  {metaAds.placements.map((p: string, idx: number) => (
                    <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">{p}</span>
                  ))}
                </div>
              </div>
            )}
            {metaAds.pixelEvents?.length > 0 && (
              <div className="p-2 bg-muted/20 rounded border border-border/30">
                <div className="text-[10px] font-medium text-muted-foreground mb-1">Pixel Events</div>
                <div className="flex flex-wrap gap-1">
                  {metaAds.pixelEvents.map((e: string, idx: number) => (
                    <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded">{e}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Reasoning */}
      {d.reasoning && (
        <div className="p-3 sm:p-4 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 rounded-lg border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">Campaign Strategy</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">{typeof d.reasoning === 'string' ? d.reasoning : JSON.stringify(d.reasoning)}</p>
        </div>
      )}
    </div>
  );
}

export default PaidTrafficOutput;
