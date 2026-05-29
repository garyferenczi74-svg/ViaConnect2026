// Prompt #170 Phase 1d: NutriVision multi-provider detect orchestrator.
//
// Single entry point an API route consumes. Picks providers in the right order,
// applies verification + tertiary rules, calls reconcile. Per Prompt 170 §2.2
// the order is LogMeal primary, Gemini secondary (verification on low conf),
// Claude Vision tertiary (mixed-dish + budget gated). Per 170a §4.1 a sha256
// cache hit returns immediately; a pHash near hit re-runs Gemini and either
// merges as a soft hit (label-overlap >= 0.80) or falls through to a full run.
//
// Every external call wraps in withTimeout. Every error path classifies via
// AIRouteError and logs through safeLog. PHI never leaves: the providers
// already enforce, and this module additionally grep-tests negative for the
// usual suspects (auth.uid, getUser, etc.) in its own test file.
//
// Hard rules honored: no em or en dashes anywhere, no emojis, no any.

import type { SupabaseClient } from '@supabase/supabase-js';

import { AIRouteError } from '@/lib/errors/classify-ai';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/nutrition/resilience/timeout';
import {
  computeSha256,
  computePHash64,
  lookupCache,
  writeCache,
} from '@/lib/nutrition/cache/recognition-cache';
import { sanitizeVisionRequest, type DeviceClass } from '@/lib/nutrition/privacy/redact';
import { parseImageWithGemini } from '@/lib/nutrition/gemini-client';

import { recognizeWithLogMeal } from './providers/logmeal';
import { recognizeWithClaude } from './providers/claude-vision';
import { reconcile, computeMeanConfidence } from './reconcile';
import type {
  ProviderRecognition,
  ReconciledRecognition,
  RecognitionProvider,
  VisionItem,
} from './types';

// Vision-provider timeouts. Originally 5000ms per Prompt 170 §3.3 ("5000 ms
// for vision provider calls"). Bumped 2026-05-29 in #170 Phase 1q hotfix 4
// because the spec underestimated Gemini-as-primary latency, which lands in
// the 8-18s range for real meal photos. The gemini-client itself has an
// internal 10s AbortController per src/lib/nutrition/gemini-client.ts:11, so
// the outer wrap must be larger than that or the inner timeout never fires.
// 30s outer for primary leaves headroom; 15s for secondary/tertiary matches
// the typical Claude vision response budget.
const DEFAULT_PRIMARY_TIMEOUT_MS = 30000;
const DEFAULT_SECONDARY_TIMEOUT_MS = 15000;
const DEFAULT_TERTIARY_TIMEOUT_MS = 15000;
const VERIFICATION_CONFIDENCE_THRESHOLD = 0.70;
const TERTIARY_CONFIDENCE_THRESHOLD = 0.55;
const PHASH_LABEL_OVERLAP_THRESHOLD = 0.80;
const DEFAULT_CLAUDE_MONTHLY_CAP_USD = 100;

// Phase 1q hotfix 10: extract the raw UUID from the requestId for the privacy
// envelope gate. newRequestId() returns "req-<uuid>" for log correlation; the
// envelope contract per Prompt 170 §2.5 requires an opaque v4 UUID, so we
// strip the optional "req-" prefix before handing the value to sanitize.
const UUID_V4_TAIL = /([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
function envelopeRequestId(requestId: string): string {
  const m = UUID_V4_TAIL.exec(requestId);
  return m ? m[1] : requestId;
}

// Mixed-dish heuristic substrings per spec §2.2 step 4.
const MIXED_DISH_TOKENS: ReadonlyArray<string> = [
  'curry', 'stew', 'casserole', 'bowl', 'stir fry', 'stir-fry',
  'paella', 'bibimbap', 'biryani', 'ramen', 'pho', 'tagine',
  'goulash', 'risotto', 'soup',
];

export interface DetectOpts {
  imageBytes: Buffer;
  mime: string;
  requestId: string;
  deviceClass:
    | 'ios_lidar'
    | 'ios_no_lidar'
    | 'android_arcore'
    | 'android_no_depth'
    | 'web';
  capturedAt: string;
  monthSpendUsdSoFar: number;
  monthlyCapUsdClaude: number;
  ambiguousMixedDishHint?: boolean;
  primaryTimeoutMs?: number;
  secondaryTimeoutMs?: number;
  tertiaryTimeoutMs?: number;
  fetch?: typeof globalThis.fetch;
  supabaseAdmin?: SupabaseClient;
}

export interface DetectResult {
  recognition: ReconciledRecognition;
  fromCache: 'sha256_exact' | 'phash_near' | 'none';
  totalLatencyMs: number;
  providersCalled: ReadonlyArray<RecognitionProvider>;
  warnings: ReadonlyArray<string>;
}

/**
 * Detect a meal in an image. Cache, primary, optional secondary verification,
 * optional tertiary on mixed dishes, then reconcile. See Prompt 170 §2.2 and
 * Prompt 170a §4.1 for the full decision tree.
 */
export async function detectMeal(opts: DetectOpts): Promise<DetectResult> {
  const start = performance.now();
  const warnings: string[] = [];
  const providersCalled: RecognitionProvider[] = [];

  const primaryTimeoutMs = opts.primaryTimeoutMs ?? DEFAULT_PRIMARY_TIMEOUT_MS;
  const secondaryTimeoutMs = opts.secondaryTimeoutMs ?? DEFAULT_SECONDARY_TIMEOUT_MS;
  const tertiaryTimeoutMs = opts.tertiaryTimeoutMs ?? DEFAULT_TERTIARY_TIMEOUT_MS;
  const monthlyCapUsd = opts.monthlyCapUsdClaude > 0
    ? opts.monthlyCapUsdClaude
    : DEFAULT_CLAUDE_MONTHLY_CAP_USD;

  // ----------------------------------------------------------------- cache
  let cacheHashSha256: string | null = null;
  let cachePHash64: bigint | null = null;

  if (opts.supabaseAdmin) {
    try {
      cacheHashSha256 = computeSha256(opts.imageBytes);
      cachePHash64 = await computePHash64(opts.imageBytes);
      const hit = await lookupCache({
        supabaseAdmin: opts.supabaseAdmin,
        imageHashSha256: cacheHashSha256,
        pHash64: cachePHash64,
      });

      if (hit?.kind === 'sha256_exact') {
        const totalLatencyMs = Math.max(0, Math.round(performance.now() - start));
        return {
          recognition: hit.recognition,
          fromCache: 'sha256_exact',
          totalLatencyMs,
          providersCalled: [],
          warnings: [],
        };
      }

      if (hit?.kind === 'phash_near') {
        // Run Gemini verification only. Soft hit if labels overlap >= 0.80.
        try {
          const secondary = await runGeminiAsProvider({
            imageBytes: opts.imageBytes,
            mime: opts.mime,
            requestId: opts.requestId,
            capturedAt: opts.capturedAt,
            deviceClass: opts.deviceClass,
            timeoutMs: secondaryTimeoutMs,
          });
          providersCalled.push('gemini');

          const overlap = jaccardLabelOverlap(
            hit.recognition.items.map((it) => it.foodName),
            secondary.items.map((it) => it.foodName),
          );

          if (overlap >= PHASH_LABEL_OVERLAP_THRESHOLD) {
            // Soft hit: reconcile cached primary with fresh Gemini secondary.
            const reconciled = reconcile({
              primary: recognitionFromCached(hit.recognition),
              secondary,
            });
            const merged = mergeReconciledWarnings(reconciled, [
              ...hit.recognition.warnings,
              ...warnings,
            ]);
            const totalLatencyMs = Math.max(0, Math.round(performance.now() - start));
            return {
              recognition: merged,
              fromCache: 'phash_near',
              totalLatencyMs,
              providersCalled,
              warnings: merged.warnings,
            };
          }
          // Label overlap below threshold: fall through to full primary pipeline.
          warnings.push('pHash near hit failed verification, running full primary pipeline.');
        } catch (err) {
          // Gemini verification failed: treat as cache miss, fall through.
          safeLog.warn(
            'nutrivision.detect.phash_verification_failed',
            'phash verification fell through',
            {
              request_id: opts.requestId,
              error_class: err instanceof AIRouteError ? err.code : 'unknown',
            },
          );
          warnings.push('pHash near hit verification failed, running full primary pipeline.');
          // Drop the gemini call we already attempted from the list so it does
          // not double-count when primary pipeline calls Gemini for verification.
          const idx = providersCalled.indexOf('gemini');
          if (idx >= 0) providersCalled.splice(idx, 1);
        }
      }
    } catch (err) {
      // Cache lookup failed entirely. Log and continue with full pipeline.
      safeLog.warn('nutrivision.detect.cache_lookup_failed', 'cache lookup failed', {
        request_id: opts.requestId,
        error: err,
      });
      warnings.push('Cache lookup unavailable.');
    }
  }

  // ----------------------------------------------------------- primary pass
  let primary: ProviderRecognition | null = null;
  let primaryRole: RecognitionProvider = 'logmeal';

  const logMealKey = process.env.LOGMEAL_API_KEY ?? '';
  if (logMealKey.length > 0) {
    try {
      primary = await recognizeWithLogMeal(opts.imageBytes, opts.mime, {
        apiKey: logMealKey,
        requestId: opts.requestId,
        capturedAt: opts.capturedAt,
        deviceClass: opts.deviceClass,
        timeoutMs: primaryTimeoutMs,
        fetch: opts.fetch,
      });
      providersCalled.push('logmeal');
    } catch (err) {
      if (err instanceof AIRouteError && err.code === 'CONFIG_MISSING') {
        // Degrade silently: missing key => Gemini-as-primary path below.
        safeLog.warn(
          'nutrivision.detect.logmeal_config_missing',
          'logmeal key missing, degrading to gemini primary',
          { request_id: opts.requestId },
        );
        warnings.push('LogMeal unavailable, using fallback recognizer as primary.');
      } else if (
        err instanceof AIRouteError &&
        (err.code === 'API_DOWN' || err.code === 'MALFORMED_RESPONSE')
      ) {
        safeLog.warn(
          'nutrivision.detect.logmeal_failed',
          'logmeal failed, degrading to gemini primary',
          {
            request_id: opts.requestId,
            provider: 'logmeal',
            error_class: err.code,
            status: err.httpStatus,
          },
        );
        warnings.push('LogMeal unreachable, using fallback recognizer as primary.');
      } else {
        // Unknown error class: surface, do not silently swallow non-AI errors.
        throw err;
      }
    }
  } else {
    safeLog.warn(
      'nutrivision.detect.logmeal_no_env_key',
      'LOGMEAL_API_KEY not configured',
      { request_id: opts.requestId },
    );
    warnings.push('LogMeal unavailable, using fallback recognizer as primary.');
  }

  // Primary fallback: Gemini-as-primary.
  if (primary === null) {
    primary = await runGeminiAsProvider({
      imageBytes: opts.imageBytes,
      mime: opts.mime,
      requestId: opts.requestId,
      capturedAt: opts.capturedAt,
      deviceClass: opts.deviceClass,
      timeoutMs: primaryTimeoutMs,
    });
    providersCalled.push('gemini');
    primaryRole = 'gemini';
  }

  // ---------------------------------------------------- secondary verification
  let secondary: ProviderRecognition | undefined;
  if (
    primary.meanConfidence < VERIFICATION_CONFIDENCE_THRESHOLD &&
    primaryRole !== 'gemini'
  ) {
    try {
      secondary = await runGeminiAsProvider({
        imageBytes: opts.imageBytes,
        mime: opts.mime,
        requestId: opts.requestId,
        capturedAt: opts.capturedAt,
        deviceClass: opts.deviceClass,
        timeoutMs: secondaryTimeoutMs,
      });
      providersCalled.push('gemini');
    } catch (err) {
      safeLog.warn(
        'nutrivision.detect.secondary_failed',
        'gemini secondary verification failed',
        {
          request_id: opts.requestId,
          provider: 'gemini',
          error_class: err instanceof AIRouteError ? err.code : 'unknown',
        },
      );
      warnings.push('Secondary verification failed, continuing with primary only.');
    }
  }

  // ------------------------------------------------------------ tertiary pass
  const tentativeReconciled = reconcile({ primary, secondary });
  let tertiary: ProviderRecognition | undefined;

  if (tentativeReconciled.mealConfidence < TERTIARY_CONFIDENCE_THRESHOLD) {
    const hint = opts.ambiguousMixedDishHint === true
      || isAmbiguousMixedDish(primary.items);
    if (hint) {
      if (opts.monthSpendUsdSoFar < monthlyCapUsd) {
        const anthropicKey = process.env.ANTHROPIC_API_KEY ?? '';
        if (anthropicKey.length === 0) {
          safeLog.warn(
            'nutrivision.detect.tertiary_no_key',
            'ANTHROPIC_API_KEY missing, skipping tertiary',
            { request_id: opts.requestId },
          );
          warnings.push('Tertiary recognition unavailable.');
        } else {
          try {
            tertiary = await recognizeWithClaude(opts.imageBytes, opts.mime, {
              apiKey: anthropicKey,
              requestId: opts.requestId,
              capturedAt: opts.capturedAt,
              deviceClass: opts.deviceClass,
              timeoutMs: tertiaryTimeoutMs,
              monthlyCapUsd,
              monthSpendUsdSoFar: opts.monthSpendUsdSoFar,
            });
            providersCalled.push('claude_vision');
          } catch (err) {
            safeLog.warn(
              'nutrivision.detect.tertiary_failed',
              'claude tertiary failed',
              {
                request_id: opts.requestId,
                provider: 'claude_vision',
                error_class: err instanceof AIRouteError ? err.code : 'unknown',
              },
            );
            warnings.push('Tertiary recognition failed.');
          }
        }
      } else {
        warnings.push('Tertiary recognition skipped, monthly cap reached.');
      }
    }
  }

  // ------------------------------------------------------------ reconcile
  const finalReconciled = tertiary
    ? reconcile({ primary, secondary, tertiary })
    : tentativeReconciled;

  const recognitionWithWarnings = mergeReconciledWarnings(
    finalReconciled,
    [...finalReconciled.warnings, ...warnings],
  );

  // -------------------------------------------------------------- cache write
  // We only reach this point on cache miss or pHash-near soft hit; the
  // sha256_exact branch returns above without touching the providers.
  if (
    opts.supabaseAdmin
    && cacheHashSha256 !== null
    && cachePHash64 !== null
  ) {
    try {
      await writeCache({
        supabaseAdmin: opts.supabaseAdmin,
        imageHashSha256: cacheHashSha256,
        pHash64: cachePHash64,
        provider: primary.provider,
        recognition: recognitionWithWarnings,
      });
    } catch (err) {
      safeLog.warn('nutrivision.detect.cache_write_failed', 'cache write failed', {
        request_id: opts.requestId,
        error: err,
      });
      // Do not propagate: the recognition itself is fine, only the cache update is lost.
    }
  }

  const totalLatencyMs = Math.max(0, Math.round(performance.now() - start));
  return {
    recognition: recognitionWithWarnings,
    fromCache: 'none',
    totalLatencyMs,
    providersCalled,
    warnings: recognitionWithWarnings.warnings,
  };
}

// ----------------------------------------------------------------------------
// Sub-routines (exported for testing)
// ----------------------------------------------------------------------------

/** Heuristic check: any item name contains a mixed-dish substring. */
export function isAmbiguousMixedDish(
  items: ReadonlyArray<{ foodName: string }>,
): boolean {
  for (const it of items) {
    const lower = it.foodName.toLowerCase();
    for (const tok of MIXED_DISH_TOKENS) {
      if (lower.indexOf(tok) >= 0) return true;
    }
  }
  return false;
}

/**
 * Adapt a parseImageWithGemini result into the ProviderRecognition shape used
 * by reconcile. Gemini returns ParsedMeal { items: [{ name, quantity, unit }], confidence }.
 * For the vision pipeline we synthesize bounding boxes by dividing the image
 * into a horizontal strip per item (a deterministic non-overlapping layout
 * stand-in until Gemini Vision returns proper bboxes), inherit the meal-level
 * confidence on each item, and tag everything as `gemini`.
 */
export function geminiToProviderRecognition(
  g: unknown,
  latencyMs: number,
): ProviderRecognition {
  if (g === null || typeof g !== 'object') {
    return { provider: 'gemini', items: [], latencyMs, meanConfidence: 0 };
  }
  const root = g as Record<string, unknown>;
  const parsed = (root.parsed as Record<string, unknown> | undefined) ?? root;
  const itemsRaw = Array.isArray(parsed.items) ? parsed.items : [];
  const confRaw = parsed.confidence;
  const conf = typeof confRaw === 'number' && Number.isFinite(confRaw)
    ? Math.max(0, Math.min(1, confRaw))
    : 0.5;

  const items: VisionItem[] = [];
  const n = itemsRaw.length;
  for (let i = 0; i < n; i++) {
    const raw = itemsRaw[i];
    if (raw === null || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === 'string' ? r.name.trim() : '';
    if (name.length === 0) continue;
    // Synthetic non-overlapping horizontal strips in normalized [0..1] space,
    // then scaled to a canonical 1000x1000 frame so reconcile's IoU has area
    // values to work with. Downstream consumers treat this as a hint, not a
    // ground-truth bbox.
    const w = 1000;
    const h = Math.max(1, Math.floor(1000 / n));
    items.push({
      id: `gemini-syn-${i}`,
      foodName: name,
      boundingBox: { x: 0, y: i * h, w, h },
      confidence: conf,
      rawProviderPayload: r,
    });
  }
  // Prompt #170a supplement §18.2: portion-weighted aggregation. Gemini's
  // synthetic items lack portionGramsHint at this stage, so every item falls
  // back to weight 1.0 and the result equals the simple mean. Wired through
  // the shared helper so future portion hints from Gemini Vision are picked
  // up automatically.
  const meanConfidence = computeMeanConfidence(items);
  return { provider: 'gemini', items, latencyMs, meanConfidence };
}

// ----------------------------------------------------------------------------
// Internals
// ----------------------------------------------------------------------------

async function runGeminiAsProvider(args: {
  imageBytes: Buffer;
  mime: string;
  requestId: string;
  capturedAt: string;
  deviceClass: DeviceClass;
  timeoutMs: number;
}): Promise<ProviderRecognition> {
  // Phase 1q hotfix 10: gemini-client.ts is the legacy parser from Prompt #164
  // and predates the explicit allowlist envelope. We enforce the gate here at
  // the call site so the same 4-key shape lands at every vision provider, not
  // just LogMeal + Claude. Throwing here means no PHI-shaped key ever reaches
  // Gemini.
  try {
    sanitizeVisionRequest({
      imageBase64: args.imageBytes.toString('base64'),
      requestId: envelopeRequestId(args.requestId),
      capturedAt: args.capturedAt,
      deviceClass: args.deviceClass,
    });
  } catch (envelopeErr) {
    safeLog.warn('nutrivision.detect.envelope_invalid', 'gemini envelope rejected', {
      request_id: args.requestId,
      error: envelopeErr instanceof Error ? envelopeErr.message : String(envelopeErr),
    });
    throw new AIRouteError(
      'INVALID_INPUT',
      `gemini provider: envelope sanitization failed: ${envelopeErr instanceof Error ? envelopeErr.message : 'unknown'}`,
      400,
      'Internal error while preparing vision request.',
    );
  }

  const start = performance.now();
  try {
    const result = await withTimeout(
      parseImageWithGemini(args.imageBytes, args.mime, ''),
      { timeoutMs: args.timeoutMs, op: 'gemini.parseImage', requestId: args.requestId },
    );
    const latencyMs = Math.max(0, Math.round(performance.now() - start));
    return geminiToProviderRecognition(result, latencyMs);
  } catch (err) {
    if (err instanceof AIRouteError) throw err;
    safeLog.warn('nutrivision.detect.gemini_failed', 'gemini provider failed', {
      request_id: args.requestId,
      provider: 'gemini',
      error: err,
    });
    throw new AIRouteError(
      'API_DOWN',
      'gemini provider: failed',
      503,
      'Vision provider unreachable, please retry.',
      err,
    );
  }
}

function jaccardLabelOverlap(
  a: ReadonlyArray<string>,
  b: ReadonlyArray<string>,
): number {
  if (a.length === 0 && b.length === 0) return 1;
  const normalize = (label: string): string => label.trim().toLowerCase();
  const setA = new Set(a.map(normalize));
  const setB = new Set(b.map(normalize));
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const label of setA) {
    if (setB.has(label)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  if (union <= 0) return 0;
  return intersection / union;
}

function recognitionFromCached(cached: ReconciledRecognition): ProviderRecognition {
  // Re-encode cached items as a ProviderRecognition so reconcile can use it
  // as a primary in the pHash soft-hit verification path. Prompt #170a
  // supplement §18.2: portion-weighted aggregation; cached items may carry
  // portionGramsHint from the original write, so this picks it up.
  const meanConfidence = computeMeanConfidence(cached.items);
  return {
    provider: cached.providerPrimary,
    items: cached.items,
    latencyMs: 0,
    meanConfidence,
  };
}

function mergeReconciledWarnings(
  reconciled: ReconciledRecognition,
  warnings: ReadonlyArray<string>,
): ReconciledRecognition {
  // Deduplicate while preserving first-seen order.
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const w of warnings) {
    if (seen.has(w)) continue;
    seen.add(w);
    merged.push(w);
  }
  return { ...reconciled, warnings: merged };
}
