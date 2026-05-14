// Prompt #164 Layer 1 + fallback: three call sites against the Gemini 2.5
// Flash REST API. Direct fetch, no SDK, no package.json change.

import { withAbortTimeout } from '@/lib/utils/with-timeout';
import { getCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { AIRouteError, classifyGeminiResponse } from '@/lib/errors/classify-ai';
import { TEXT_PARSE_SYSTEM_INSTRUCTION, PHOTO_PARSE_SYSTEM_INSTRUCTION, ESTIMATION_FALLBACK_INSTRUCTION, GEMINI_MODEL } from './gemini-prompts';
import { ParsedMealSchema, type ParsedMeal } from './parsed-meal-schema';

const BASE = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const TIMEOUT_MS = 10_000;
const breaker = getCircuitBreaker('gemini-api', { failureThreshold: 5, resetTimeoutMs: 60_000, halfOpenMaxAttempts: 1 });

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface ParseResult {
  parsed: ParsedMeal;
  usage: Usage;
}

export interface EstimationResult {
  nutrients: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    total_fat_g: number;
    saturated_fat_g: number;
    trans_fat_g: number;
    omega3_g: number;
    sugar_g: number;
    fiber_g: number;
  };
  confidence: number;
  usage: Usage;
}

function requireKey(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new AIRouteError('AUTH_MISSING', 'GEMINI_API_KEY not configured', 500, 'AI is not configured. Please contact support.');
  return k;
}

async function callGemini(body: unknown): Promise<{ text: string; usage: Usage }> {
  const key = requireKey();
  const res = await breaker.execute(() =>
    withAbortTimeout((s) => fetch(`${BASE}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: s,
    }), TIMEOUT_MS, 'gemini.generateContent'),
  );
  if (!res.ok) {
    const c = classifyGeminiResponse(res.status);
    throw new AIRouteError(c.code, `gemini ${res.status}`, c.httpStatus, c.userMessage);
  }
  const json = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new AIRouteError('MALFORMED_RESPONSE', 'empty candidates', 502, 'AI returned no content. Try again or enter manually.');
  return {
    text,
    usage: {
      inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

// Recover JSON that Gemini truncated mid-output. Walks the text, tracking
// the last position where the document was structurally complete (all
// containers closed). Returns that prefix + balancing close-tokens. Returns
// null if nothing parseable was found.
function recoverTruncatedJson(text: string): string | null {
  const start = text.search(/[{[]/);
  if (start < 0) return null;
  const stack: string[] = [];
  let lastValueEnd = -1;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === '\\' && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; if (!inString) lastValueEnd = i; continue; }
    if (inString) continue;
    if (c === '{') stack.push('}');
    else if (c === '[') stack.push(']');
    else if (c === '}' || c === ']') { if (stack.pop() !== c) return null; lastValueEnd = i; }
    else if (/[\d\w.+\-]/.test(c)) lastValueEnd = i;
  }
  if (lastValueEnd < 0) return null;
  let candidate = text.slice(start, lastValueEnd + 1);
  // Strip dangling separators (trailing comma or open key) before closing.
  candidate = candidate.replace(/,\s*$/, '').replace(/"[^"]*"\s*:\s*$/, '');
  while (stack.length) candidate += stack.pop();
  try { JSON.parse(candidate); return candidate; } catch { return null; }
}

function parseJsonOrThrow(text: string): unknown {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Hardening (#168): try object extraction first, then array extraction.
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {
        /* fall through */
      }
    }
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket >= 0 && lastBracket > firstBracket) {
      try {
        return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
      } catch {
        /* fall through */
      }
    }
    // Truncation recovery: Gemini sometimes stops mid-output (observed on
    // estimateItemWithGemini after USDA fallback returned the JSON with
    // first 4 of 10 fields and no closing brace). Close it at the last
    // complete value so partial parse succeeds; consumers already use
    // `?? 0` for missing nutrient fields.
    const recovered = recoverTruncatedJson(cleaned);
    if (recovered !== null) {
      try { return JSON.parse(recovered); } catch { /* fall through */ }
    }
    // Diagnostic: surface the raw Gemini text on Vercel runtime logs so the
    // next failure leaves a trace we can fix the parse path against. First
    // 500 chars only to keep the log entry small.
    // eslint-disable-next-line no-console
    console.warn('[gemini-client] parse failed, raw text preview:', text.slice(0, 500));
    throw new AIRouteError('MALFORMED_RESPONSE', 'gemini json parse', 502, 'AI returned malformed output. Try again or enter manually.');
  }
}

async function parseDescriptionAttempt(description: string): Promise<ParseResult> {
  const { text, usage } = await callGemini({
    systemInstruction: { parts: [{ text: TEXT_PARSE_SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: description }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 1024 },
  });
  const parsed = ParsedMealSchema.parse(parseJsonOrThrow(text));
  return { parsed, usage };
}

export async function parseDescriptionWithGemini(description: string): Promise<ParseResult> {
  try {
    return await parseDescriptionAttempt(description);
  } catch (err) {
    // Auto-retry once on MALFORMED_RESPONSE. Gemini 2.5 Flash is
    // non-deterministic at temperature 0.2; a single retry catches transient
    // JSON parse failures without burning quota. The circuit breaker handles
    // chronic issues at the call layer.
    if (err instanceof AIRouteError && err.code === 'MALFORMED_RESPONSE') {
      // eslint-disable-next-line no-console
      console.warn('[gemini-client] MALFORMED_RESPONSE; retrying once');
      return await parseDescriptionAttempt(description);
    }
    throw err;
  }
}

export async function parseImageWithGemini(buf: Buffer, mimeType: string, note: string): Promise<ParseResult> {
  const data = buf.toString('base64');
  const { text, usage } = await callGemini({
    systemInstruction: { parts: [{ text: PHOTO_PARSE_SYSTEM_INSTRUCTION }] },
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data } },
        { text: note ? `Context: ${note}` : 'Analyze this meal.' },
      ],
    }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 1024 },
  });
  const parsed = ParsedMealSchema.parse(parseJsonOrThrow(text));
  return { parsed, usage };
}

async function estimateItemAttempt(name: string, quantity: number, unit: string): Promise<EstimationResult> {
  const { text, usage } = await callGemini({
    systemInstruction: { parts: [{ text: ESTIMATION_FALLBACK_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: `${quantity} ${unit} ${name}` }] }],
    // 1024 (was 512): observed truncation at ~4 fields with 512, raised so
    // Gemini has headroom for all 10 nutrient fields plus formatting.
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json', maxOutputTokens: 1024 },
  });
  const parsed = parseJsonOrThrow(text) as Record<string, number>;
  return {
    nutrients: {
      calories: Math.round(parsed.calories ?? 0),
      protein_g: parsed.protein_g ?? 0,
      carbs_g: parsed.carbs_g ?? 0,
      total_fat_g: parsed.total_fat_g ?? 0,
      saturated_fat_g: parsed.saturated_fat_g ?? 0,
      trans_fat_g: parsed.trans_fat_g ?? 0,
      omega3_g: parsed.omega3_g ?? 0,
      sugar_g: parsed.sugar_g ?? 0,
      fiber_g: parsed.fiber_g ?? 0,
    },
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    usage,
  };
}

export async function estimateItemWithGemini(name: string, quantity: number, unit: string): Promise<EstimationResult> {
  try {
    return await estimateItemAttempt(name, quantity, unit);
  } catch (err) {
    if (err instanceof AIRouteError && err.code === 'MALFORMED_RESPONSE') {
      // eslint-disable-next-line no-console
      console.warn('[gemini-client] estimate MALFORMED_RESPONSE; retrying once');
      return await estimateItemAttempt(name, quantity, unit);
    }
    throw err;
  }
}
