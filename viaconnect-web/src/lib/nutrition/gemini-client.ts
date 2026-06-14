// Prompt #164 Layer 1 + fallback: three call sites against the Gemini 2.5
// Flash REST API. Direct fetch, no SDK, no package.json change.
//
// Prompt 180e (2026-06-08): bumped per call timeout from 10s to 18s and
// added a single retry on transient 5xx so a momentary Gemini blip no
// longer trips the circuit breaker. Production logs surfaced a burst
// of analyze-text 503s where Gemini was returning 5xx; the breaker
// opens after 5 failures and stays open for 60s, so every subsequent
// caller hit "AI is temporarily unavailable" for a full minute even
// when the provider recovered seconds later.
//
// Prompt 180f (2026-06-08): Claude (Anthropic Messages API) wired as
// the text fallback provider. When the Gemini call throws an
// AIRouteError tagged API_DOWN, RATE_LIMITED, or AUTH_INVALID, the
// text only helpers (parseDescription, estimateItem) reroute the
// same prompt to Claude Haiku 4.5 through its own circuit breaker
// and timeout. The model id is the documented current Haiku id;
// Haiku is selected over Sonnet to keep fallback cost low (this
// path fires only during Gemini outages). The image path
// (parseImageWithGemini) is unchanged: the vision pipeline already
// has Claude Vision as a tertiary provider further upstream.

import Anthropic from '@anthropic-ai/sdk';
import { withAbortTimeout } from '@/lib/utils/with-timeout';
import { getCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { AIRouteError, classifyGeminiResponse } from '@/lib/errors/classify-ai';
import { safeLog } from '@/lib/utils/safe-log';
import { TEXT_PARSE_SYSTEM_INSTRUCTION, PHOTO_PARSE_SYSTEM_INSTRUCTION, ESTIMATION_FALLBACK_INSTRUCTION, GEMINI_MODEL } from './gemini-prompts';
import { ParsedMealSchema, normalizeParsedMealNulls, type ParsedMeal } from './parsed-meal-schema';

const BASE = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const TIMEOUT_MS = 18_000;
const RETRY_BACKOFF_MS = 800;
const breaker = getCircuitBreaker('gemini-api', { failureThreshold: 5, resetTimeoutMs: 60_000, halfOpenMaxAttempts: 1 });

// Claude text fallback configuration. Independent breaker so a Gemini
// outage does not propagate into Claude's failure window.
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const CLAUDE_TIMEOUT_MS = 18_000;
// Gary 2026-06-12 incident follow-through (Hannah + Gordon): the Claude
// fallback gets the same 2048 headroom as the Gemini parse call so a large
// meal cannot truncate the same way during a Gemini outage.
const CLAUDE_MAX_TOKENS = 2048;
const claudeBreaker = getCircuitBreaker('claude-text-api', {
  failureThreshold: 5,
  resetTimeoutMs: 60_000,
  halfOpenMaxAttempts: 1,
});

// Codes that should trigger the Claude fallback. Any other AIRouteError
// (INVALID_INPUT, MALFORMED_RESPONSE, NO_RECOGNITION, etc) reflects a
// callable upstream and gets rethrown without a fallback attempt.
const FALLBACK_CODES = new Set(['API_DOWN', 'RATE_LIMITED', 'AUTH_INVALID']);

async function fetchGeminiOnce(url: string, body: unknown): Promise<Response> {
  return withAbortTimeout(
    (s) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: s,
      }),
    TIMEOUT_MS,
    'gemini.generateContent',
  );
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface ParseResult {
  parsed: ParsedMeal;
  usage: Usage;
}

// Prompt 186: secondary nutrients the model omits stay UNKNOWN (null), never
// 0. Core macros (calories, protein, carbs, fat) are required; a response
// missing them is malformed and goes through the existing retry path.
export interface EstimationResult {
  nutrients: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    total_fat_g: number;
    saturated_fat_g: number | null;
    trans_fat_g: number | null;
    omega3_g: number | null;
    sugar_g: number | null;
    fiber_g: number | null;
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
  const url = `${BASE}?key=${key}`;
  // Prompt 180e (2026-06-08): single retry on 5xx with a short backoff.
  // The breaker counts only the outer execute result so one transient
  // blip no longer pushes us toward the failureThreshold of 5. 429
  // (rate limited) is not retried because retry would just trip the
  // upstream quota harder; the breaker still handles that case.
  const res = await breaker.execute(async () => {
    let first: Response | null = null;
    try {
      first = await fetchGeminiOnce(url, body);
    } catch (err) {
      // Network or timeout error: retry once before letting the breaker
      // count this attempt.
      safeLog.warn('gemini.callGemini', 'first attempt threw, retrying', {
        error: err instanceof Error ? err.message : String(err),
      });
      await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
      return fetchGeminiOnce(url, body);
    }
    if (first.status >= 500 && first.status <= 599) {
      safeLog.warn('gemini.callGemini', 'first attempt 5xx, retrying', {
        status: first.status,
      });
      await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
      const second = await fetchGeminiOnce(url, body);
      return second;
    }
    return first;
  });
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

// Claude text fallback. Reuses the same system instruction the Gemini
// path uses, so the produced JSON has the same shape and the existing
// parsers (ParsedMealSchema, estimateItemAttempt) work unmodified.
// Returns a Gemini compatible { text, usage } so downstream code is
// agnostic to which provider answered.
// Prompt 186 incident fix (2026-06-11): Vercel production carries the
// Anthropic key as Anthropic_API_Key (and PHOTO_AI_ANTHROPIC_API_KEY for
// the photo stack); process.env is case sensitive, so reading only
// ANTHROPIC_API_KEY meant the 180f Claude fallback had NEVER fired in
// production and Gemini rate limiting failed meals outright. Accept the
// names that exist; empty strings fall through.
function anthropicApiKey(): string | undefined {
  return (
    process.env.ANTHROPIC_API_KEY ||
    process.env.Anthropic_API_Key ||
    process.env.PHOTO_AI_ANTHROPIC_API_KEY ||
    undefined
  );
}

async function callClaudeText(args: {
  systemInstruction: string;
  userText: string;
}): Promise<{ text: string; usage: Usage }> {
  const key = anthropicApiKey();
  if (!key) {
    throw new AIRouteError(
      'AUTH_MISSING',
      'ANTHROPIC_API_KEY not configured',
      500,
      'AI is not configured. Please contact support.',
    );
  }
  const client = new Anthropic({ apiKey: key });
  try {
    const message = await claudeBreaker.execute(() =>
      withAbortTimeout(
        (s) =>
          client.messages.create(
            {
              model: CLAUDE_MODEL,
              max_tokens: CLAUDE_MAX_TOKENS,
              system: args.systemInstruction,
              messages: [{ role: 'user', content: args.userText }],
            },
            { signal: s },
          ),
        CLAUDE_TIMEOUT_MS,
        'claude.messages.create',
      ),
    );
    // Concatenate text blocks; Anthropic returns an array of content
    // blocks. Non text blocks are ignored because the system prompt
    // restricts output to JSON.
    let text = '';
    for (const block of message.content) {
      if (block.type === 'text') text += block.text;
    }
    if (!text) {
      throw new AIRouteError(
        'MALFORMED_RESPONSE',
        'claude empty content',
        502,
        'AI returned no content. Try again or enter manually.',
      );
    }
    return {
      text,
      usage: {
        inputTokens: message.usage?.input_tokens ?? 0,
        outputTokens: message.usage?.output_tokens ?? 0,
      },
    };
  } catch (err) {
    if (err instanceof AIRouteError) throw err;
    safeLog.warn('gemini.callClaudeText', 'claude call failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new AIRouteError(
      'API_DOWN',
      `claude ${err instanceof Error ? err.name : 'unknown'}`,
      503,
      'AI is temporarily unavailable. Try again or enter manually.',
    );
  }
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

// Gary 2026-06-12 incident: schema rejection must surface as
// MALFORMED_RESPONSE (retryable, consistent user message), never as a raw
// ZodError. A raw ZodError skipped the parse retry AND the route's
// AIRouteError handling, so a truncated-then-recovered parse whose last
// item lost a required field reached the user as UNKNOWN 500.
function validateParsedMeal(raw: unknown): ParsedMeal {
  const result = ParsedMealSchema.safeParse(normalizeParsedMealNulls(raw));
  if (!result.success) {
    const first = result.error.issues[0];
    throw new AIRouteError(
      'MALFORMED_RESPONSE',
      `parsed meal schema: ${first ? `${first.path.join('.')} ${first.code}` : 'invalid'}`,
      502,
      'AI returned incomplete output. Try again or enter manually.',
    );
  }
  return result.data;
}

// Parse generationConfig per the Gary 2026-06-12 incident: gemini-2.5-flash
// thinks by default and thought tokens count against maxOutputTokens. A
// multi item description costs 600 plus thought tokens, so the old 1024
// ceiling truncated the parse JSON mid item (finishReason MAX_TOKENS,
// reproduced 4 of 4 against the live API). Identical reasoning to the
// 2026-06-11 estimator incident fix below: extraction is a lookup task,
// not a reasoning task, so thinking goes off and the JSON gets headroom.
const PARSE_GENERATION_CONFIG = {
  temperature: 0.2,
  responseMimeType: 'application/json',
  maxOutputTokens: 2048,
  thinkingConfig: { thinkingBudget: 0 },
} as const;

// Photo parse config. Gary 2026-06-13 regression: the 2026-06-12 truncation fix
// (deb06979) shared PARSE_GENERATION_CONFIG across the text AND photo parses,
// which turned thinking OFF for the photo path too. Photo recognition is a vision
// REASONING task (look at the plate, identify items, estimate portions, and
// self-report a calibrated confidence), and with thinking off the model returned
// systematically low confidence: NutriVision meals saved before the change
// averaged 0.89, after it they came back at or below 0.4. This config restores a
// CAPPED thinking budget for the photo path so the model reasons again, while the
// larger maxOutputTokens guarantees room for thinking plus the JSON so it never
// truncates (the 2026-06-11 502 the shared config was meant to fix: response room
// is maxOutputTokens minus the capped thinking budget, here at least 4096). The
// text + estimation paths stay thinking-off because they are lookups, not vision.
const PHOTO_PARSE_GENERATION_CONFIG = {
  temperature: 0.2,
  responseMimeType: 'application/json',
  maxOutputTokens: 6144,
  thinkingConfig: { thinkingBudget: 2048 },
} as const;

async function parseDescriptionAttempt(description: string): Promise<ParseResult> {
  const { text, usage } = await callGemini({
    systemInstruction: { parts: [{ text: TEXT_PARSE_SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: description }] }],
    generationConfig: PARSE_GENERATION_CONFIG,
  });
  const parsed = validateParsedMeal(parseJsonOrThrow(text));
  return { parsed, usage };
}

async function parseDescriptionWithClaude(description: string): Promise<ParseResult> {
  const { text, usage } = await callClaudeText({
    systemInstruction: TEXT_PARSE_SYSTEM_INSTRUCTION,
    userText: description,
  });
  const parsed = validateParsedMeal(parseJsonOrThrow(text));
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
      try {
        return await parseDescriptionAttempt(description);
      } catch (retryErr) {
        // Fall through to Claude fallback below if the retry surfaces
        // a fallback class code.
        if (retryErr instanceof AIRouteError && FALLBACK_CODES.has(retryErr.code)) {
          err = retryErr;
        } else {
          throw retryErr;
        }
      }
    }
    // Prompt 180f (2026-06-08): Claude text fallback. Only triggers on
    // API_DOWN / RATE_LIMITED / AUTH_INVALID so a Gemini outage does
    // not strand the user. Claude failures rethrow the original
    // Gemini error so the user message stays consistent.
    if (err instanceof AIRouteError && FALLBACK_CODES.has(err.code)) {
      safeLog.warn('gemini.parseDescription', 'gemini failed, trying claude fallback', {
        gemini_code: err.code,
      });
      try {
        return await parseDescriptionWithClaude(description);
      } catch (claudeErr) {
        safeLog.error('gemini.parseDescription', 'claude fallback also failed', {
          gemini_code: err.code,
          claude_error: claudeErr instanceof Error ? claudeErr.message : String(claudeErr),
        });
        throw err;
      }
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
    // Photo parse keeps thinking ON via PHOTO_PARSE_GENERATION_CONFIG: the model
    // must reason about the image to recognize foods and self-report a calibrated
    // confidence. Sharing the thinking-off text config (deb06979) tanked photo
    // confidence to <=0.4 (Gary 2026-06-13). The capped thinking budget plus the
    // larger token headroom keep the JSON from truncating (the 2026-06-11 502).
    generationConfig: PHOTO_PARSE_GENERATION_CONFIG,
  });
  const parsed = validateParsedMeal(parseJsonOrThrow(text));
  return { parsed, usage };
}

function decodeEstimation(text: string, usage: Usage): EstimationResult {
  const parsed = parseJsonOrThrow(text) as Record<string, number>;
  const numOrNull = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;
  // Core macros must be present; estimates without them are malformed and
  // the caller's retry handles it. Secondary nutrients stay null when the
  // model omits them (Prompt 186 unknown-vs-zero contract).
  const core = {
    calories: numOrNull(parsed.calories),
    protein_g: numOrNull(parsed.protein_g),
    carbs_g: numOrNull(parsed.carbs_g),
    total_fat_g: numOrNull(parsed.total_fat_g),
  };
  if (core.calories === null || core.protein_g === null || core.carbs_g === null || core.total_fat_g === null) {
    throw new AIRouteError('MALFORMED_RESPONSE', 'estimation missing core macros', 502, 'AI returned incomplete output. Try again or enter manually.');
  }
  return {
    nutrients: {
      calories: Math.round(core.calories),
      protein_g: core.protein_g,
      carbs_g: core.carbs_g,
      total_fat_g: core.total_fat_g,
      saturated_fat_g: numOrNull(parsed.saturated_fat_g),
      trans_fat_g: numOrNull(parsed.trans_fat_g),
      omega3_g: numOrNull(parsed.omega3_g),
      sugar_g: numOrNull(parsed.sugar_g),
      fiber_g: numOrNull(parsed.fiber_g),
    },
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    usage,
  };
}

async function estimateItemAttempt(name: string, quantity: number, unit: string): Promise<EstimationResult> {
  const { text, usage } = await callGemini({
    systemInstruction: { parts: [{ text: ESTIMATION_FALLBACK_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: `${quantity} ${unit} ${name}` }] }],
    // Prompt 186 incident fix (2026-06-11): gemini-2.5-flash thinks by
    // default and its thought tokens count against maxOutputTokens, which
    // is what truncated these tiny 10-field JSON responses mid-output
    // (production: "AI returned incomplete output"). This is a lookup
    // task, not a reasoning task: thinking off, plus headroom at 2048
    // (was 1024, observed truncation at ~4 fields with 512).
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  return decodeEstimation(text, usage);
}

async function estimateItemWithClaude(name: string, quantity: number, unit: string): Promise<EstimationResult> {
  const { text, usage } = await callClaudeText({
    systemInstruction: ESTIMATION_FALLBACK_INSTRUCTION,
    userText: `${quantity} ${unit} ${name}`,
  });
  return decodeEstimation(text, usage);
}

export async function estimateItemWithGemini(name: string, quantity: number, unit: string): Promise<EstimationResult> {
  try {
    return await estimateItemAttempt(name, quantity, unit);
  } catch (err) {
    if (err instanceof AIRouteError && err.code === 'MALFORMED_RESPONSE') {
      // eslint-disable-next-line no-console
      console.warn('[gemini-client] estimate MALFORMED_RESPONSE; retrying once');
      try {
        return await estimateItemAttempt(name, quantity, unit);
      } catch (retryErr) {
        // Prompt 186 incident fix: a second malformed estimation also
        // falls through to Claude. Unlike the parse path, this output is
        // ten numeric fields; Claude emits it reliably, and the
        // alternative was failing the user's whole meal.
        if (retryErr instanceof AIRouteError && (FALLBACK_CODES.has(retryErr.code) || retryErr.code === 'MALFORMED_RESPONSE')) {
          err = retryErr;
        } else {
          throw retryErr;
        }
      }
    }
    // Prompt 180f (2026-06-08): Claude text fallback for the per
    // item estimation path. Same code gating as parseDescription, plus
    // MALFORMED_RESPONSE (Prompt 186).
    if (err instanceof AIRouteError && (FALLBACK_CODES.has(err.code) || err.code === 'MALFORMED_RESPONSE')) {
      safeLog.warn('gemini.estimateItem', 'gemini failed, trying claude fallback', {
        gemini_code: err.code,
      });
      try {
        return await estimateItemWithClaude(name, quantity, unit);
      } catch (claudeErr) {
        safeLog.error('gemini.estimateItem', 'claude fallback also failed', {
          gemini_code: err.code,
          claude_error: claudeErr instanceof Error ? claudeErr.message : String(claudeErr),
        });
        throw err;
      }
    }
    throw err;
  }
}
