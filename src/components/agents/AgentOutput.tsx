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

// ── Module-level translation cache — persists across popup open/close ──
const translationCache = new Map<string, any>();

function buildCacheKey(agentId: string, language: string, data: any): string {
  const dataStr = JSON.stringify(data);
  return `${agentId}:${language}:${dataStr.slice(0, 300)}:${dataStr.length}`;
}

/**
 * Split a data object into small chunks for parallel translation.
 * Each top-level key becomes a separate chunk so the LLM can handle it.
 */
function splitIntoChunks(data: any): { key: string; value: any }[] {
  if (!data || typeof data !== 'object') return [];
  const chunks: { key: string; value: any }[] = [];
  for (const [key, value] of Object.entries(data)) {
    // Skip non-translatable fields
    if (value === null || value === undefined) continue;
    if (typeof value === 'number' || typeof value === 'boolean') continue;
    // Skip very short strings (likely IDs, codes) and non-text keys
    if (typeof value === 'string' && (value.length < 10 || /^https?:\/\//.test(value))) continue;
    chunks.push({ key, value });
  }
  return chunks;
}

/** Translate a single chunk via the API */
async function translateChunk(chunkData: any, language: string): Promise<any> {
  const res = await apiFetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: chunkData, language }),
  });
  const result = await res.json();
  return result.translated ?? chunkData;
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
  // Normalize: if data is a string (double-serialized), parse it
  let normalizedData = data;
  if (typeof normalizedData === 'string') {
    try { normalizedData = JSON.parse(normalizedData); } catch { /* keep as-is */ }
  }

  // ── Translation logic ──
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const projects = useAppStore((s) => s.projects);
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const projectLanguage = selectedProject?.language || 'en';
  const langLabel = SUPPORTED_LANGUAGES.find((l) => l.code === projectLanguage)?.label || projectLanguage;
  const needsTranslation = projectLanguage !== 'en';

  // Extract the actual data payload for translation (unwrap success/data wrapper)
  const dataPayload = normalizedData?.data || normalizedData;

  const cacheKey = needsTranslation && dataPayload ? buildCacheKey(agentId, projectLanguage, dataPayload) : '';

  const [translatedData, setTranslatedData] = useState<any>(() => {
    if (!needsTranslation) return null;
    return translationCache.get(cacheKey) || null;
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const translationRef = useRef<string>('');

  useEffect(() => {
    if (!needsTranslation || !dataPayload || typeof dataPayload !== 'object') {
      setTranslatedData(null);
      return;
    }

    // Already have cached translation
    const cached = translationCache.get(cacheKey);
    if (cached) {
      if (translationRef.current !== cacheKey) {
        translationRef.current = cacheKey;
        setTranslatedData(cached);
      }
      return;
    }

    // Already translating this exact data
    if (translationRef.current === cacheKey) return;
    translationRef.current = cacheKey;
    setTranslatedData(null);
    setIsTranslating(true);

    // Split data into chunks and translate in parallel
    const chunks = splitIntoChunks(dataPayload);
    if (chunks.length === 0) {
      setIsTranslating(false);
      return;
    }

    setProgress({ done: 0, total: chunks.length });
    const results: Record<string, any> = {};
    let completed = 0;

    // Copy non-translatable fields directly
    for (const [key, value] of Object.entries(dataPayload)) {
      if (!chunks.find(c => c.key === key)) {
        results[key] = value;
      }
    }

    chunks.forEach(({ key, value }) => {
      translateChunk(value, projectLanguage)
        .then((translated) => {
          results[key] = translated;
        })
        .catch(() => {
          results[key] = value; // Keep original on failure
        })
        .finally(() => {
          completed++;
          setProgress({ done: completed, total: chunks.length });

          if (completed >= chunks.length) {
            // All chunks done — save to cache and update state
            translationCache.set(cacheKey, results);
            setTranslatedData(results);
            setIsTranslating(false);
          }
        });
    });
  }, [needsTranslation, cacheKey, dataPayload, projectLanguage]);

  // Build the final data to pass to output components
  let displayData = normalizedData;
  if (translatedData) {
    if (normalizedData?.data) {
      displayData = { ...normalizedData, data: translatedData };
    } else {
      displayData = translatedData;
    }
  }

  // Check for error output — show error message instead of "no data yet" placeholder
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

  // Translation status badge
  const translationBadge = needsTranslation ? (
    <div className="flex items-center gap-1.5 mb-3">
      {isTranslating ? (
        <>
          <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span className="text-xs text-amber-400">
            Translating to {langLabel}… {progress.done > 0 && `(${progress.done}/${progress.total})`}
          </span>
        </>
      ) : translatedData ? (
        <>
          <Languages className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs text-green-400">Translated to {langLabel}</span>
        </>
      ) : null}
    </div>
  ) : null;

  // Render the appropriate output component with translated data
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
