// Bland AI API client for AI voice calls
// Docs: https://docs.bland.ai/

const BLAND_BASE = 'https://api.bland.ai/v1';

function getApiKey(): string | null {
  return process.env.BLANDAI_API_KEY || null;
}

async function blandFetch(endpoint: string, options: { method?: string; body?: any } = {}): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('BLANDAI_API_KEY not configured');

  const res = await fetch(`${BLAND_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bland AI API error ${res.status}: ${text}`);
  }

  return res.json();
}

export interface BlandCallRequest {
  phone: string;
  task: string;
  firstSentence?: string;
  model?: string;
  voice?: string;
  maxDuration?: number;
  record?: boolean;
  transferPhoneNumber?: string;
  metadata?: Record<string, any>;
  webhook?: string;
  from?: string; // Bland AI phone number to call from (required for international calls)
}

export interface BlandCallResult {
  callId: string;
  status: string;
  duration: number;
  transcript: string;
  recordingUrl?: string;
  summary?: string;
  concatenatedTranscript?: string;
  analysis?: any;
}

/** Initiate an AI voice call */
export async function makeCall(params: BlandCallRequest): Promise<BlandCallResult> {
  const result = await blandFetch('/calls', {
    method: 'POST',
    body: {
      phone_number: params.phone,
      task: params.task,
      first_sentence: params.firstSentence || undefined,
      model: params.model || 'enhanced',
      voice: params.voice || 'nat',
      max_duration: params.maxDuration || 300,
      record: params.record !== false,
      transfer_phone_number: params.transferPhoneNumber || undefined,
      metadata: params.metadata || {},
      ...(params.webhook ? { webhook: params.webhook } : {}),
      // 'from' is required for international calls — uses BLANDAI_FROM_NUMBER env var
      from: params.from || process.env.BLANDAI_FROM_NUMBER || undefined,
    },
  });

  return {
    callId: result.call_id,
    status: result.status || 'queued',
    duration: 0,
    transcript: '',
  };
}

/** Get call details and transcript */
export async function getCallDetails(callId: string): Promise<BlandCallResult> {
  const result = await blandFetch(`/calls/${callId}`);

  // Bland AI uses queue_status and completed fields in addition to status
  // Determine real status from multiple fields
  let status = result.status || 'in-progress';
  if (result.completed === true && result.queue_status === 'complete') {
    status = 'completed';
  }

  // Duration is in minutes from Bland AI — convert to seconds
  const durationMinutes = result.call_length || 0;
  const durationSeconds = Math.round(durationMinutes * 60);

  return {
    callId: result.call_id || callId,
    status,
    duration: durationSeconds,
    transcript: result.concatenated_transcript || result.transcript || '',
    recordingUrl: result.recording_url || '',
    summary: result.summary || '',
    concatenatedTranscript: result.concatenated_transcript || '',
    analysis: result.analysis || null,
  };
}

/** Analyze a completed call transcript */
export async function analyzeCall(callId: string, questions: string[]): Promise<Record<string, string>> {
  const result = await blandFetch(`/calls/${callId}/analyze`, {
    method: 'POST',
    body: {
      questions: questions.map((q) => ({ question: q })),
    },
  });

  const answers: Record<string, string> = {};
  if (result.answers) {
    questions.forEach((q, i) => {
      answers[q] = result.answers[i] || '';
    });
  }
  return answers;
}

/** Wait for a call to complete with transcript (polls every 10s, max 8 min) */
export async function waitForCall(callId: string, maxWaitMs = 480000): Promise<BlandCallResult> {
  const start = Date.now();

  // Phase 1: Wait for call to finish (status becomes completed/failed/no-answer)
  while (Date.now() - start < maxWaitMs) {
    const details = await getCallDetails(callId);

    if (details.status === 'failed' || details.status === 'no-answer') {
      return details;
    }

    // Call is done — now wait for transcript
    if (details.status === 'completed' || details.status === 'ended') {
      // Phase 2: Wait up to 60s for transcript to become available
      for (let i = 0; i < 12; i++) {
        const updated = await getCallDetails(callId);
        if (updated.transcript && updated.transcript.length > 50 && updated.duration > 0) {
          return updated;
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
      // Return whatever we have after 60s
      return await getCallDetails(callId);
    }

    // Still in progress — keep polling
    await new Promise((r) => setTimeout(r, 10000));
  }

  // Timed out — get final state
  return getCallDetails(callId);
}

/** Check if Bland AI API is available */
export function isBlandAIAvailable(): boolean {
  return !!getApiKey();
}
