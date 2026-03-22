import { NextResponse } from 'next/server';

export const maxDuration = 60;

/**
 * POST /api/translate
 *
 * Translates a JSON chunk to a target language using the configured LLM.
 * The frontend splits the data into small chunks and calls this endpoint
 * in parallel for speed.
 *
 * Body: { data: object, language: string, section?: string }
 * Returns: { translated: object }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { data, language } = body;

  if (!data || !language || language === 'en') {
    return NextResponse.json({ translated: data });
  }

  const LANG_LABELS: Record<string, string> = {
    de: 'German', es: 'Spanish', fr: 'French', pt: 'Portuguese', it: 'Italian',
    nl: 'Dutch', hi: 'Hindi', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
    ar: 'Arabic', ru: 'Russian', tr: 'Turkish', pl: 'Polish', sv: 'Swedish',
    da: 'Danish', fi: 'Finnish', no: 'Norwegian', th: 'Thai', vi: 'Vietnamese',
    id: 'Indonesian', ms: 'Malay', he: 'Hebrew', cs: 'Czech', ro: 'Romanian',
    hu: 'Hungarian', uk: 'Ukrainian', el: 'Greek', bn: 'Bengali',
  };
  const langLabel = LANG_LABELS[language] || language;

  const systemPrompt = `You are a fast professional translator. Translate ALL human-readable text values in the JSON to ${langLabel}.

RULES:
- Return ONLY valid JSON — no markdown, no code fences, no explanation
- Keep the EXACT same JSON structure and keys (keys stay in English)
- Translate string values that are human-readable text
- Do NOT translate: URLs, email addresses, {placeholder} tokens, numbers, brand/product names
- Keep timing notations like "(0-3s)" as-is
- Be concise and fast`;

  const userMessage = JSON.stringify(data);

  try {
    const translated = await callLLM(systemPrompt, userMessage);
    const parsed = extractJson(translated);
    return NextResponse.json({ translated: parsed });
  } catch (error: any) {
    console.error('[translate] failed:', error.message);
    return NextResponse.json({ translated: data });
  }
}

function extractJson(text: string): any {
  try { return JSON.parse(text); } catch {}
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch {}
  }
  const start = text.indexOf('{');
  if (start === -1) {
    const arrStart = text.indexOf('[');
    const arrEnd = text.lastIndexOf(']');
    if (arrStart !== -1 && arrEnd > arrStart) {
      try { return JSON.parse(text.slice(arrStart, arrEnd + 1)); } catch {}
    }
  }
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch {}
  }
  throw new Error('Could not parse translated JSON');
}

async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const aiEngine = process.env.AI_ENGINE;

  type Engine = { name: string; call: () => Promise<string> };
  const engines: Engine[] = [];

  const addOpenRouter = () => {
    if (openrouterKey) engines.push({ name: 'openrouter', call: () => callOpenRouter(systemPrompt, userMessage, openrouterKey) });
  };
  const addGemini = () => {
    if (geminiKey) engines.push({ name: 'gemini', call: () => callGemini(systemPrompt, userMessage, geminiKey) });
  };
  const addAnthropic = () => {
    if (anthropicKey) engines.push({ name: 'anthropic', call: () => callAnthropic(systemPrompt, userMessage, anthropicKey) });
  };

  if (aiEngine === 'openrouter') { addOpenRouter(); addGemini(); addAnthropic(); }
  else if (aiEngine === 'anthropic') { addAnthropic(); addOpenRouter(); addGemini(); }
  else if (aiEngine === 'gemini') { addGemini(); addOpenRouter(); addAnthropic(); }
  else { addOpenRouter(); addGemini(); addAnthropic(); }

  if (engines.length === 0) throw new Error('No LLM API key configured');

  let lastError = '';
  for (const engine of engines) {
    try { return await engine.call(); }
    catch (e: any) { lastError = `${engine.name}: ${e.message}`; }
  }
  throw new Error(`All engines failed: ${lastError}`);
}

async function callOpenRouter(system: string, user: string, apiKey: string): Promise<string> {
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model, max_tokens: 8192, temperature: 0.3,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

async function callGemini(system: string, user: string, apiKey: string): Promise<string> {
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: 8192, temperature: 0.3 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callAnthropic(system: string, user: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514', max_tokens: 8192, temperature: 0.3,
      system, messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const json = await res.json();
  return json.content?.[0]?.text || '';
}
