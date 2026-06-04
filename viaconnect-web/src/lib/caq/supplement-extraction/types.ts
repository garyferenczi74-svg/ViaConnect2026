// =============================================================================
// Prompt 175 Part B (2026-06-04): provider-agnostic extraction contract.
//
// Single source of truth for the extraction surface. Every tier inside the
// router (Haiku, Sonnet, optional Opus) returns the same shape so the
// upstream model is a config choice rather than a downstream rewrite.
// =============================================================================

// Provider tiers across the supplement extraction surface. 175a Part B
// adds 'gemini' as the new primary OCR tier per master spec 5.3 (Gemini
// 2.5 Pro Vision primary, Claude Sonnet tertiary capped at 3 percent).
// Haiku and Opus tiers remain in the type union so the existing
// claude-tier adapter compiles without edit; the provider-router used by
// the supplement-vision route from 175b onward only consults gemini +
// sonnet.
export type ModelTier = 'gemini' | 'haiku' | 'sonnet' | 'opus';

export type ExtractionOutcomeCode =
  | 'success'
  | 'config_missing'         // ANTHROPIC_API_KEY not present at request time
  | 'circuit_open'           // upstream breaker tripped
  | 'timeout'                // request exceeded the per-tier deadline
  | 'upstream_error'         // non-2xx or transport failure
  | 'parse_failed'           // model returned non-JSON or unparseable JSON
  | 'unsupported_image'      // mime type / dimension / size validation failed
  | 'image_normalize_failed' // HEIC convert or sharp pipeline crashed
  | 'no_items'               // model parsed cleanly but found nothing on the label
  | 'unknown';

export interface ExtractedSupplement {
  rawText: string;        // exactly what the model read off the label
  name: string;           // proposed product or ingredient name
  brand: string | null;
  dose: number | null;
  unit: string | null;    // mg, mcg, IU, g, ml
  form: string | null;    // capsule, tablet, softgel, powder, liquid, gummy
  confidence: number;     // 0..1, model self-reported plus heuristic
}

export interface ExtractionResult {
  items: ExtractedSupplement[];
  modelTier: ModelTier;
  escalated: boolean;
  latencyMs: number;
  outcomeCode: ExtractionOutcomeCode;
}

// Per-tier attempt record kept by the router so observability can write a
// single row per request even when the router escalated. The router's
// public result is the final tier; this is the audit trail.
export interface TierAttempt {
  tier: ModelTier;
  outcomeCode: ExtractionOutcomeCode;
  itemCount: number;
  avgConfidence: number; // 0 when no items
  latencyMs: number;
}
