// Prompt #170 Phase 1c: multi-provider arbitration for NutriVision.
//
// Per Prompt 170 §2.2, the three vision providers (LogMeal primary, Gemini
// secondary, Claude Vision tertiary) feed into this module. Reconcile walks
// the primary item set, looks for IoU-overlapping items from secondary (then
// optionally tertiary), and merges matches via confidence-weighted voting.
// Mismatching labels at the same bbox preserve the primary name and surface
// a warning. Non-overlapping items from later providers are appended with a
// 0.85 discount to confidence (unverified by primary).
//
// Weights:
//   - 2 providers: primary 0.6, secondary 0.4
//   - 3 providers: primary 0.5, secondary 0.3, tertiary 0.2
//
// Empty primary throws AIRouteError NO_RECOGNITION so the route layer can
// turn it into the spec-mandated "We could not identify foods in this photo"
// message. The reconcile result feeds the resolver (next Phase).
//
// Hard rules honored: no em or en dashes anywhere, no emojis, no any.

import { AIRouteError } from '@/lib/errors/classify-ai';
import type {
  BoundingBox,
  ProviderRecognition,
  ReconciledRecognition,
  VisionItem,
} from './types';

const DEFAULT_IOU_THRESHOLD = 0.4;
const NON_OVERLAP_DISCOUNT = 0.85;
const TWO_PROVIDER_WEIGHTS = { primary: 0.6, secondary: 0.4 } as const;
const THREE_PROVIDER_WEIGHTS = { primary: 0.5, secondary: 0.3, tertiary: 0.2 } as const;
const LOOSE_LABEL_LEVENSHTEIN_MAX = 2;

/**
 * Prompt #170a supplement §18.2: portion-weighted mean confidence.
 *
 * Replaces the prior simple arithmetic mean used by detect, reconcile, and
 * provider clients. Larger items (by portion grams) carry proportionally
 * more weight; portion-less items fall back to weight 1.0. Pure function;
 * exported so detect.ts, reconcile, and provider modules share the same
 * formula and the analyze-route response carries a portion-aware confidence
 * end to end.
 *
 * Edge cases:
 *   - empty items -> 0
 *   - all weights zero or negative -> 0 (defensive; should not happen)
 *   - portionGramsHint undefined or non-finite -> weight 1.0 per spec
 */
export function computeMeanConfidence(
  items: ReadonlyArray<VisionItem>,
): number {
  if (items.length === 0) return 0;
  let weightSum = 0;
  let confidenceWeightedSum = 0;
  for (const it of items) {
    const hint = it.portionGramsHint;
    const w = typeof hint === 'number' && Number.isFinite(hint) && hint > 0
      ? hint
      : 1.0;
    weightSum += w;
    confidenceWeightedSum += it.confidence * w;
  }
  return weightSum > 0 ? confidenceWeightedSum / weightSum : 0;
}

export interface ReconcileInput {
  primary: ProviderRecognition;
  secondary?: ProviderRecognition;
  tertiary?: ProviderRecognition;
  iouThreshold?: number;
}

/** Compute the Intersection over Union of two bounding boxes. Returns 0 when either has zero area. */
export function computeIoU(a: BoundingBox, b: BoundingBox): number {
  const aArea = a.w * a.h;
  const bArea = b.w * b.h;
  if (aArea <= 0 || bArea <= 0) return 0;

  const ix1 = Math.max(a.x, b.x);
  const iy1 = Math.max(a.y, b.y);
  const ix2 = Math.min(a.x + a.w, b.x + b.w);
  const iy2 = Math.min(a.y + a.h, b.y + b.h);

  const iw = ix2 - ix1;
  const ih = iy2 - iy1;
  if (iw <= 0 || ih <= 0) return 0;

  const intersection = iw * ih;
  const union = aArea + bArea - intersection;
  if (union <= 0) return 0;
  return intersection / union;
}

/**
 * Inline iterative Levenshtein distance over UTF-16 code units.
 * Standard two-row DP; O(m*n) time, O(min(m,n)) space.
 * Used by looseLabelEquals; not exported separately to keep the surface small.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Make `a` the shorter to bound row size.
  let s = a;
  let t = b;
  if (s.length > t.length) {
    const tmp = s;
    s = t;
    t = tmp;
  }

  const m = s.length;
  const n = t.length;
  let prev = new Array<number>(m + 1);
  let curr = new Array<number>(m + 1);
  for (let i = 0; i <= m; i++) prev[i] = i;

  for (let j = 1; j <= n; j++) {
    curr[0] = j;
    const tj = t.charCodeAt(j - 1);
    for (let i = 1; i <= m; i++) {
      const cost = s.charCodeAt(i - 1) === tj ? 0 : 1;
      const del = prev[i] + 1;
      const ins = curr[i - 1] + 1;
      const sub = prev[i - 1] + cost;
      curr[i] = Math.min(del, ins, sub);
    }
    const swap = prev;
    prev = curr;
    curr = swap;
  }
  return prev[m];
}

/** Loose label equality: case-insensitive trim equal OR levenshtein <= 2. */
export function looseLabelEquals(a: string, b: string): boolean {
  const al = a.trim().toLowerCase();
  const bl = b.trim().toLowerCase();
  if (al === bl) return true;
  return levenshtein(al, bl) <= LOOSE_LABEL_LEVENSHTEIN_MAX;
}

interface MergeWeights {
  primary: number;
  secondary?: number;
  tertiary?: number;
}

interface PendingItem {
  base: VisionItem;
  contributions: Array<{
    item: VisionItem;
    role: 'primary' | 'secondary' | 'tertiary';
  }>;
}

function pickPreferred<T>(
  contributions: PendingItem['contributions'],
  selector: (it: VisionItem) => T | undefined,
): T | undefined {
  // Choose the contribution with the highest confidence whose field is defined.
  let best: { conf: number; value: T } | null = null;
  for (const c of contributions) {
    const value = selector(c.item);
    if (value === undefined) continue;
    if (best === null || c.item.confidence > best.conf) {
      best = { conf: c.item.confidence, value };
    }
  }
  return best?.value;
}

function weightedConfidence(
  pending: PendingItem,
  weights: MergeWeights,
): number {
  // Sum only the weights for roles that actually contributed.
  let totalWeight = 0;
  let weightedSum = 0;
  for (const c of pending.contributions) {
    const w = c.role === 'primary'
      ? weights.primary
      : c.role === 'secondary'
        ? (weights.secondary ?? 0)
        : (weights.tertiary ?? 0);
    if (w <= 0) continue;
    totalWeight += w;
    weightedSum += c.item.confidence * w;
  }
  if (totalWeight <= 0) return 0;
  const raw = weightedSum / totalWeight;
  if (raw < 0) return 0;
  if (raw > 1) return 1;
  return raw;
}

function mergeContributions(
  pending: PendingItem,
  weights: MergeWeights,
): VisionItem {
  const confidence = weightedConfidence(pending, weights);
  const cookingMethod = pickPreferred(pending.contributions, (it) => it.cookingMethod);
  const cuisineTag = pickPreferred(pending.contributions, (it) => it.cuisineTag);
  const foodLanguage = pickPreferred(pending.contributions, (it) => it.foodLanguage);
  const portionGramsHint = pickPreferred(pending.contributions, (it) => it.portionGramsHint);
  const portionVolumeMlHint = pickPreferred(pending.contributions, (it) => it.portionVolumeMlHint);

  return {
    id: pending.base.id,
    foodName: pending.base.foodName,
    foodLanguage,
    cuisineTag,
    boundingBox: pending.base.boundingBox,
    confidence,
    portionGramsHint,
    portionVolumeMlHint,
    cookingMethod,
    rawProviderPayload: pending.base.rawProviderPayload,
  };
}

function appendDiscounted(
  it: VisionItem,
  discount: number,
): VisionItem {
  const raw = it.confidence * discount;
  const clamped = raw < 0 ? 0 : raw > 1 ? 1 : raw;
  return { ...it, confidence: clamped };
}

/**
 * Reconcile primary then optional secondary then optional tertiary provider
 * recognitions into a single merged result with overlap-aware confidence
 * weighting. Throws AIRouteError NO_RECOGNITION when primary has no items.
 */
export function reconcile(input: ReconcileInput): ReconciledRecognition {
  const iouThreshold = input.iouThreshold ?? DEFAULT_IOU_THRESHOLD;
  const primary = input.primary;

  if (primary.items.length === 0) {
    throw new AIRouteError(
      'NO_RECOGNITION',
      'reconcile: empty primary',
      502,
      'We could not identify foods in this photo. Try a clearer shot.',
    );
  }

  const weights: MergeWeights = input.tertiary
    ? { ...THREE_PROVIDER_WEIGHTS }
    : input.secondary
      ? { primary: TWO_PROVIDER_WEIGHTS.primary, secondary: TWO_PROVIDER_WEIGHTS.secondary }
      : { primary: 1 };

  // Seed pending items with primary contributions.
  const pending: PendingItem[] = primary.items.map((it) => ({
    base: it,
    contributions: [{ item: it, role: 'primary' }],
  }));
  const warnings: string[] = [];
  const appended: VisionItem[] = [];

  function foldProvider(
    incoming: ProviderRecognition | undefined,
    role: 'secondary' | 'tertiary',
  ): void {
    if (!incoming) return;
    for (const candidate of incoming.items) {
      let bestIdx = -1;
      let bestIoU = 0;
      for (let i = 0; i < pending.length; i++) {
        const iou = computeIoU(candidate.boundingBox, pending[i].base.boundingBox);
        if (iou > bestIoU) {
          bestIoU = iou;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0 && bestIoU >= iouThreshold) {
        const target = pending[bestIdx];
        const sameLabel = looseLabelEquals(candidate.foodName, target.base.foodName);
        if (sameLabel) {
          target.contributions.push({ item: candidate, role });
        } else {
          const bb = target.base.boundingBox;
          warnings.push(
            `providers disagreed on item label at bbox (${bb.x},${bb.y},${bb.w},${bb.h}): primary said ${target.base.foodName}, ${role} said ${candidate.foodName}`,
          );
        }
      } else {
        appended.push(appendDiscounted(candidate, NON_OVERLAP_DISCOUNT));
      }
    }
  }

  foldProvider(input.secondary, 'secondary');
  foldProvider(input.tertiary, 'tertiary');

  const mergedFromPrimary = pending.map((p) => mergeContributions(p, weights));
  const items: VisionItem[] = [...mergedFromPrimary, ...appended];

  // Prompt #170a supplement §18.2: portion-weighted aggregation so larger
  // items dominate the meal-level confidence number, matching how callers
  // (detect tertiary gate, classifyConfidence band, awardNutriVisionHelixEvents
  // high-confidence gate, response payload) consume it.
  const mealConfidence = computeMeanConfidence(items);

  return {
    items,
    providerPrimary: primary.provider,
    providerSecondary: input.secondary?.provider,
    providerTertiary: input.tertiary?.provider,
    mealConfidence,
    warnings,
  };
}
