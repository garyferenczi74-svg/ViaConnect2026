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

function parseJsonOrThrow(text: string): unknown {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new AIRouteError('MALFORMED_RESPONSE', 'gemini json parse', 502, 'AI returned malformed output. Try again or enter manually.');
  }
}

export async function parseDescriptionWithGemini(description: string): Promise<ParseResult> {
  const { text, usage } = await callGemini({
    systemInstruction: { parts: [{ text: TEXT_PARSE_SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: description }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 1024 },
  });
  const parsed = ParsedMealSchema.parse(parseJsonOrThrow(text));
  return { parsed, usage };
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

export async function estimateItemWithGemini(name: string, quantity: number, unit: string): Promise<EstimationResult> {
  const { text, usage } = await callGemini({
    systemInstruction: { parts: [{ text: ESTIMATION_FALLBACK_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: `${quantity} ${unit} ${name}` }] }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json', maxOutputTokens: 512 },
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
