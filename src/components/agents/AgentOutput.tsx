'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { useAppStore, SUPPORTED_LANGUAGES } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import { ServiceResearchOutput } from './outputs/ServiceResearchOutput';
import { OfferEngineeringOutput } from './outputs/OfferEngineeringOutput';
import { ValidationOutput } from './outputs/ValidationOutput';
import { FunnelBuilderOutput } from './outputs/FunnelBuilderOutput';
import { ContentCreativeOutput } from './outputs/ContentCreativeOutput';
import { PaidTrafficOutput } from './outputs/PaidTrafficOutput';
import { OutboundOutreachOutput } from './outputs/OutboundOutreachOutput';
import { InboundCaptureOutput } from './outputs/InboundCaptureOutput';
import { AIQualificationOutput } from './outputs/AIQualificationOutput';
import { SalesRoutingOutput } from './outputs/SalesRoutingOutput';
import { TrackingAttributionOutput } from './outputs/TrackingAttributionOutput';
import { PerformanceOptimizationOutput } from './outputs/PerformanceOptimizationOutput';
import { CRMHygieneOutput } from './outputs/CRMHygieneOutput';
import { GenericAgentOutput } from './outputs/GenericAgentOutput';

// ── Module-level translation state — shared between preTranslateAgent & component ──
const translationCache = new Map<string, any>();          // cacheKey → translated data
const inflightPromises = new Map<string, Promise<any>>(); // cacheKey → pending promise
let cachedLanguage = '';

/** Clear all caches when project language changes */
function ensureCacheLanguage(language: string) {
  if (cachedLanguage && cachedLanguage !== language) {
    translationCache.clear();
    inflightPromises.clear();
  }
  cachedLanguage = language;
}

function buildCacheKey(agentId: string, language: string, data: any): string {
  const dataStr = JSON.stringify(data);
  return `${agentId}:${language}:${dataStr.slice(0, 300)}:${dataStr.length}`;
}

function splitIntoChunks(data: any): { key: string; value: any }[] {
  if (!data || typeof data !== 'object') return [];
  const chunks: { key: string; value: any }[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'number' || typeof value === 'boolean') continue;
    if (typeof value === 'string' && (value.length < 10 || /^https?:\/\//.test(value))) continue;
    chunks.push({ key, value });
  }
  return chunks;
}

async function translateChunk(chunkData: any, language: string): Promise<any> {
  const res = await apiFetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: chunkData, language }),
  });
  const result = await res.json();
  return result.translated ?? chunkData;
}

/**
 * Core translation function — used by both preTranslateAgent and the component.
 * Returns a promise that resolves to the translated data. If a translation for
 * the same cacheKey is already in-flight, returns the existing promise (dedup).
 */
function translateData(cacheKey: string, dataPayload: any, language: string): Promise<any> {
  // Already fully cached
  const cached = translationCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  // Already in-flight — reuse the same promise
  const inflight = inflightPromises.get(cacheKey);
  if (inflight) return inflight;

  // Start new translation
  const promise = (async () => {
    const chunks = splitIntoChunks(dataPayload);
    const results: Record<string, any> = {};

    // Copy non-translatable fields
    for (const [key, value] of Object.entries(dataPayload)) {
      if (!chunks.find(c => c.key === key)) {
        results[key] = value;
      }
    }

    if (chunks.length === 0) {
      translationCache.set(cacheKey, results);
      return results;
    }

    // Translate all chunks in parallel
    await Promise.all(
      chunks.map(async ({ key, value }) => {
        try {
          results[key] = await translateChunk(value, language);
        } catch {
          results[key] = value;
        }
      })
    );

    translationCache.set(cacheKey, results);
    inflightPromises.delete(cacheKey);
    return results;
  })();

  inflightPromises.set(cacheKey, promise);
  return promise;
}

/**
 * Pre-translate agent output in the background (call right after agent completes).
 * Populates the cache so AgentOutput renders instantly when opened.
 */
export async function preTranslateAgent(agentId: string, language: string, rawOutput: any): Promise<void> {
  if (!language || language === 'en' || !rawOutput) return;

  ensureCacheLanguage(language);

  const dataPayload = rawOutput?.data || rawOutput;
  if (!dataPayload || typeof dataPayload !== 'object') return;

  const cacheKey = buildCacheKey(agentId, language, dataPayload);
  await translateData(cacheKey, dataPayload, language);
}

interface AgentOutputProps {
  agentId: string;
  agentName?: string;
  data: any;
  isLive?: boolean;
  agentRunId?: string;
  onResolved?: (resolvedData: any) => void;
}

/**
 * Routes to the appropriate output component based on agent ID.
 * Auto-translates output data when the project language is not English.
 */
export function AgentOutput({ agentId, agentName, data, isLive = false, agentRunId, onResolved }: AgentOutputProps) {
  let normalizedData = data;
  if (typeof normalizedData === 'string') {
    try { normalizedData = JSON.parse(normalizedData); } catch { /* keep as-is */ }
  }

  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const projects = useAppStore((s) => s.projects);
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const projectLanguage = selectedProject?.language || 'en';
  const langLabel = SUPPORTED_LANGUAGES.find((l) => l.code === projectLanguage)?.label || projectLanguage;
  const needsTranslation = projectLanguage !== 'en';

  if (needsTranslation) ensureCacheLanguage(projectLanguage);

  const dataPayload = normalizedData?.data || normalizedData;
  const cacheKey = needsTranslation && dataPayload ? buildCacheKey(agentId, projectLanguage, dataPayload) : '';

  // Initialize from cache immediately (background translation may have finished)
  const [translatedData, setTranslatedData] = useState<any>(() => {
    if (!needsTranslation || !cacheKey) return null;
    return translationCache.get(cacheKey) || null;
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const translationRef = useRef<string>('');

  // Reset when language changes
  const prevLangRef = useRef(projectLanguage);
  if (prevLangRef.current !== projectLanguage) {
    prevLangRef.current = projectLanguage;
    translationRef.current = '';
  }

  useEffect(() => {
    if (!needsTranslation || !dataPayload || typeof dataPayload !== 'object') {
      setTranslatedData(null);
      return;
    }

    // Check cache (background translation may have completed)
    const cached = translationCache.get(cacheKey);
    if (cached) {
      translationRef.current = cacheKey;
      setTranslatedData(cached);
      return;
    }

    // Don't start duplicate work for the same key
    if (translationRef.current === cacheKey) return;
    translationRef.current = cacheKey;
    setIsTranslating(true);

    // Use shared translateData — reuses in-flight promise if background already started
    translateData(cacheKey, dataPayload, projectLanguage)
      .then((result) => {
        if (translationRef.current === cacheKey) {
          setTranslatedData(result);
          setIsTranslating(false);
        }
      })
      .catch(() => {
        if (translationRef.current === cacheKey) {
          setIsTranslating(false);
        }
      });
  }, [needsTranslation, cacheKey, dataPayload, projectLanguage]);

  // Also poll for background completion (in case preTranslateAgent finishes while this component is mounted)
  useEffect(() => {
    if (!needsTranslation || !cacheKey || translatedData) return;

    const interval = setInterval(() => {
      const cached = translationCache.get(cacheKey);
      if (cached) {
        setTranslatedData(cached);
        setIsTranslating(false);
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [needsTranslation, cacheKey, translatedData]);

  // Build display data
  let displayData = normalizedData;
  if (translatedData) {
    if (normalizedData?.data) {
      displayData = { ...normalizedData, data: translatedData };
    } else {
      displayData = translatedData;
    }
  }

  // Error output
  const errorMsg = normalizedData?.error
    || normalizedData?.data?.error
    || (normalizedData?.success === false && normalizedData?.reasoning);
  if (errorMsg) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-950/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-red-400">Agent Error</span>
        </div>
        <p className="text-sm text-red-300/80">{typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}</p>
        {normalizedData?.reasoning && normalizedData.reasoning !== errorMsg && (
          <p className="text-xs text-zinc-500 mt-2">{normalizedData.reasoning}</p>
        )}
      </div>
    );
  }

  // Translation badge
  const translationBadge = needsTranslation ? (
    <div className="flex items-center gap-1.5 mb-3">
      {isTranslating ? (
        <>
          <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span className="text-xs text-amber-400">Translating to {langLabel}…</span>
        </>
      ) : translatedData ? (
        <>
          <Languages className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs text-green-400">Translated to {langLabel}</span>
        </>
      ) : null}
    </div>
  ) : null;

  const outputComponent = (() => {
    switch (agentId) {
      case 'service-research':
        return <ServiceResearchOutput data={displayData} isLive={isLive} />;
      case 'offer-engineering':
        return <OfferEngineeringOutput data={displayData} />;
      case 'validation':
        return <ValidationOutput data={displayData} />;
      case 'funnel-builder':
        return <FunnelBuilderOutput data={displayData} />;
      case 'content-creative':
        return <ContentCreativeOutput data={displayData} />;
      case 'paid-traffic':
        return <PaidTrafficOutput data={displayData} />;
      case 'outbound-outreach':
        return <OutboundOutreachOutput data={displayData} />;
      case 'inbound-capture':
        return <InboundCaptureOutput data={displayData} />;
      case 'ai-qualification':
        return <AIQualificationOutput data={displayData} agentRunId={agentRunId} onResolved={onResolved} />;
      case 'sales-routing':
        return <SalesRoutingOutput data={displayData} />;
      case 'tracking-attribution':
        return <TrackingAttributionOutput data={displayData} />;
      case 'performance-optimization':
        return <PerformanceOptimizationOutput data={displayData} />;
      case 'crm-hygiene':
        return <CRMHygieneOutput data={displayData} />;
      default:
        return <GenericAgentOutput data={displayData} agentId={agentId} agentName={agentName} />;
    }
  })();

  return (
    <div>
      {translationBadge}
      {outputComponent}
    </div>
  );
}

export default AgentOutput;
