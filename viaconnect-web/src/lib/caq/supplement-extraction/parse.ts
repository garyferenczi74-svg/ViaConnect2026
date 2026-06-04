// =============================================================================
// Prompt 175 Part B (2026-06-04): JSON extraction from Claude responses.
//
// Strips markdown code fences, isolates the first top-level JSON object,
// and JSON.parse inside a try/catch. The model is instructed to return
// JSON only, but we defend against fences + leading prose anyway so the
// pipeline never throws on a chatty response.
// =============================================================================

import type { ExtractedSupplement } from './types';

/**
 * Strip ```json ... ``` fences and surrounding whitespace.
 */
export function stripCodeFences(raw: string): string {
  return raw.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
}

/**
 * Extract the first JSON object substring from a possibly-noisy response.
 * Returns null when nothing parseable exists.
 */
export function extractJsonObject(raw: string): string | null {
  const clean = stripCodeFences(raw);
  const m = clean.match(/\{[\s\S]*\}/);
  return m ? m[0] : null;
}

export interface ParsedExtraction {
  items: ExtractedSupplement[];
}

/**
 * Parse a Claude response body into the normalized contract. Robust to
 * missing fields and to slightly different JSON shapes from different
 * tiers; coerces with defensive defaults rather than throwing. The router
 * derives outcomeCode from the item count + average confidence.
 */
export function parseClaudeExtraction(raw: string): ParsedExtraction | null {
  const json = extractJsonObject(raw);
  if (!json) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(json);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== 'object') return null;

  // Accept either an items array (175 Part B canonical shape) or the prior
  // ingredients shape used by the existing supplement-vision route, so a
  // single tier helper can serve both call sites during the migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const root = obj as any;
  const sourceArray = Array.isArray(root.items)
    ? root.items
    : Array.isArray(root.ingredients)
      ? root.ingredients
      : null;
  if (!sourceArray) return { items: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: ExtractedSupplement[] = sourceArray.map((row: any) => normalizeItem(row, root));
  return { items };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeItem(row: any, root: any): ExtractedSupplement {
  const name =
    coerceString(row?.name) ??
    coerceString(row?.productName) ??
    coerceString(root?.productName) ??
    '';
  const brand =
    coerceString(row?.brand) ??
    coerceString(root?.brand) ??
    null;
  const dose = coerceNumber(row?.dose ?? row?.amount);
  const unit = coerceString(row?.unit);
  const form = coerceString(row?.form ?? row?.dosageForm);
  const rawText = coerceString(row?.rawText) ?? name;
  const confidence = clampConfidence(
    coerceNumber(row?.confidence) ??
    mapStringConfidence(coerceString(row?.confidence ?? root?.overallConfidence ?? root?.confidence)),
  );
  return { rawText, name, brand, dose, unit, form, confidence };
}

function coerceString(v: unknown): string | null {
  if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  return null;
}

function coerceNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function mapStringConfidence(s: string | null): number | null {
  if (s === null) return null;
  const lower = s.toLowerCase();
  if (lower === 'high') return 0.9;
  if (lower === 'medium' || lower === 'mid') return 0.7;
  if (lower === 'low') return 0.4;
  return null;
}

function clampConfidence(n: number | null): number {
  if (n === null || !Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) {
    // Tolerate percent (0..100) by normalizing.
    if (n <= 100) return n / 100;
    return 1;
  }
  return n;
}
