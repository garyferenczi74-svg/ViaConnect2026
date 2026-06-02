// Prompt 172 Phase 2 (172b): BOS line resolver.
//
// Pure server side TypeScript function. No React, no DOM, no fetch. Reads
// the two most recent bio_optimization_history rows for the user and maps
// the delta to one of four kinds per the documented threshold rule below.
// Microcopy is resolved through the 172a layer with the safety mode variant
// applied per spec 5.7.
//
// Threshold rule (judgment call, documented per spec):
//   noise band = +/- 0.5 score points.
//   delta = latest.score - previous.score (latest most recent date desc,
//           compute_seq desc).
//   delta >= +0.5   -> positive_delta
//   delta in (-0.5, +0.5)  -> neutral
//   delta <= -0.5   -> gentle_caution
//   fewer than 2 rows on file -> learning
//   on any read error -> null (the card hides the slot)
//
// Why +/- 0.5: BOS scores live on a 0 to 100 scale and Hannah's compute is
// stable to about one tenth between consecutive runs when nothing material
// changes. A meaningful nudge from a single meal needs to clear day to day
// jitter; 0.5 is the empirical floor that filters that jitter without
// hiding genuine movement. The exact number is recoverable via env override
// when post launch data argues for a tighter or looser band.
//
// Safety mode: the resolver still returns a non null line (the user opted
// into the silent ratio mode contract, not into silence on the BOS line
// itself). The kind selection logic is identical; the variant on
// getMicrocopy flips the copy to the food positive non quantitative phrase.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import type { SupabaseClient } from '@supabase/supabase-js';
import { getMicrocopy } from '@/lib/nutrition/microcopy';
import type { MicrocopyKey, MicrocopyVariant } from '@/lib/nutrition/microcopy';
import type { BosLine, BosLineKind } from './types';

export const BOS_LINE_NOISE_BAND = 0.5;

export interface ResolveBosLineInput {
  mealId: string;
  userId: string;
  safetyMode: boolean;
}

interface BosHistoryRow {
  score: number | null;
}

function microcopyKeyFor(kind: BosLineKind): MicrocopyKey {
  switch (kind) {
    case 'positive_delta':
      return 'bos.positive_delta';
    case 'neutral':
      return 'bos.neutral';
    case 'gentle_caution':
      return 'bos.gentle_caution';
    case 'learning':
      return 'bos.learning';
  }
}

function variantFor(safetyMode: boolean): MicrocopyVariant {
  return safetyMode ? 'safety_mode' : 'normal';
}

/**
 * Map a numeric delta to a BosLineKind. Exported for unit tests so the
 * threshold rule has a single source of truth callers can pin against.
 */
export function classifyDelta(delta: number): Exclude<BosLineKind, 'learning'> {
  if (delta >= BOS_LINE_NOISE_BAND) return 'positive_delta';
  if (delta <= -BOS_LINE_NOISE_BAND) return 'gentle_caution';
  return 'neutral';
}

/**
 * Build a BosLine view model from a resolved kind + the caller context.
 * Exported so the route handler can compose without re reading the resolver
 * when it short circuits on a kill switch.
 */
export function buildBosLine(args: {
  kind: BosLineKind;
  mealId: string;
  safetyMode: boolean;
  generatedAt?: string;
}): BosLine {
  const variant = variantFor(args.safetyMode);
  const copy = getMicrocopy(microcopyKeyFor(args.kind), variant);
  return {
    kind: args.kind,
    copy,
    mealId: args.mealId,
    generatedAt: args.generatedAt ?? new Date().toISOString(),
  };
}

/**
 * Resolve the BOS line for a saved meal. Pure server side. Takes a Supabase
 * client by injection so unit tests can stub the chain without spinning up
 * the real client. The route handler builds the admin client at the entry
 * point and passes it here.
 *
 * Returns null when:
 *   - the bio_optimization_history read errors (the card hides the slot).
 *   - the user has fewer than one persisted BOS row at all (we cannot even
 *     return the learning copy because we have no scoring engine signal of
 *     any kind on file yet).
 * Returns a BosLine with kind 'learning' when the user has exactly one row.
 */
export async function resolveBosLine(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  input: ResolveBosLineInput,
): Promise<BosLine | null> {
  const { mealId, userId, safetyMode } = input;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('bio_optimization_history')
    .select('score')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('compute_seq', { ascending: false })
    .limit(2);

  if (error) {
    return null;
  }

  const rows = (Array.isArray(data) ? data : []) as BosHistoryRow[];

  if (rows.length === 0) {
    // No analytics history at all. Returning null lets the slot stay quiet
    // for a first time logger instead of nudging them with a generic
    // "learning" line that implies the score engine has already touched them.
    return null;
  }

  if (rows.length === 1) {
    return buildBosLine({ kind: 'learning', mealId, safetyMode });
  }

  const latest = rows[0]?.score;
  const previous = rows[1]?.score;

  if (typeof latest !== 'number' || typeof previous !== 'number') {
    // Pre SSOT rows sometimes carry null scores; treat as learning so the
    // slot still surfaces a neutral non quantitative line.
    return buildBosLine({ kind: 'learning', mealId, safetyMode });
  }

  const delta = latest - previous;
  const kind = classifyDelta(delta);
  return buildBosLine({ kind, mealId, safetyMode });
}
