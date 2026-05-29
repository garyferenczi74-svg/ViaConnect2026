// Prompt #160 section 8: Helix Rewards integration point.
//
// Consumer portal only. Practitioner portal sees only the aggregate
// engagement score 0 to 100; this module must never surface point counts
// or earning events to practitioners.
//
// TODO(#160 follow-up): wire to the existing awardHelixPoints helper once
// located. Source values per spec:
//   nutrition_log_text                      5 points (capped 4 awards / day)
//   nutrition_log_photo                     5 points (capped 4 awards / day)
//   nutrition_achievement_first_photo      10 points (one-time)
//   nutrition_achievement_streak_7         15 points (7-day streak, 3 logs / day)
//
// This stub centralizes the call site so the integration can be activated
// without re-touching the route handlers.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NutritionSource } from './schema';
import { withTimeout } from './resilience/timeout';
import { safeLog } from '@/lib/utils/safe-log';

interface AwardArgs {
  readonly userId: string;
  readonly source: NutritionSource;
}

export async function awardNutritionLogPoints(args: AwardArgs): Promise<void> {
  // TODO(#160 follow-up): replace with live awardHelixPoints + daily cap +
  // achievement bonuses (first photo, 7-day streak).
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[helix-bridge] awardNutritionLogPoints queued', JSON.stringify(args));
  }
}

// ---------------------------------------------------------------------------
// Prompt #170 Phase 1i: NutriVision-specific awards.
//
// Consumer portal only. Practitioner views never surface these; the boundary
// is enforced upstream at the practitioner portal level per Prompt 170 section
// 17 and Standing Rule 11.
//
// Live schema (verified 2026-05-29 against live, #170 Phase 1q hotfix 5):
//   helix_transactions: (user_id, amount, type CHECK enum, description,
//     metadata, challenge_id, referral_id, event_type_id, helix_tier_at_time,
//     pool_type, source_user_id, created_at).
//   type CHECK admits ('earn', 'redeem', 'bonus', 'referral', 'adjustment',
//     'body_scan_completed') only. Phase 1i guessed 'earn_meal' and
//     'earn_research' which fail at runtime; corrected to 'earn' across all
//     four NutriVision events. Granular ids live in event_type_id
//     (FK to helix_earning_event_types.id) and metadata.event_key.
// ---------------------------------------------------------------------------

export type NutriVisionEventKey =
  | 'nutrivision_meal_logged'
  | 'nutrivision_high_confidence'
  | 'nutrivision_user_refined'
  | 'corpus_contribution';

export interface NutriVisionHelixContext {
  supabaseAdmin: SupabaseClient;
  userId: string;
  mealId: string;
  mealConfidence?: number;
  userModified: boolean;
  contributedPhotoPath?: string | null;
  requestId: string;
}

export interface NutriVisionHelixAwards {
  awarded: ReadonlyArray<NutriVisionEventKey>;
  totalPoints: number;
  errors: ReadonlyArray<{ event: string; error_class: string }>;
}

interface PendingAward {
  eventKey: NutriVisionEventKey;
  amount: number;
  txType: 'earn';
  description: string;
}

// Prompt #170a supplement §18.1: high-confidence threshold raised from the
// Phase 1i baseline of 0.85 to a tunable env-driven value (default still 0.85
// to preserve current behavior). Lets ops adjust without a redeploy when the
// post-launch confidence distribution lands.
const HIGH_CONFIDENCE_THRESHOLD = Number(process.env.NUTRIVISION_CONFIDENCE_HIGH_THRESHOLD) || 0.85;
const HELIX_INSERT_TIMEOUT_MS = 2000;

function classifyError(err: unknown): string {
  if (err instanceof Error) return err.name;
  if (typeof err === 'object' && err !== null) {
    const maybe = err as { name?: unknown };
    if (typeof maybe.name === 'string') return maybe.name;
  }
  return 'UnknownError';
}

function buildPending(ctx: NutriVisionHelixContext): PendingAward[] {
  const out: PendingAward[] = [
    {
      eventKey: 'nutrivision_meal_logged',
      amount: 5,
      txType: 'earn',
      description: 'NutriVision Meal Logged',
    },
  ];

  if (typeof ctx.mealConfidence === 'number' && ctx.mealConfidence >= HIGH_CONFIDENCE_THRESHOLD) {
    out.push({
      eventKey: 'nutrivision_high_confidence',
      amount: 2,
      txType: 'earn',
      description: 'High Confidence NutriVision Meal',
    });
  }

  if (ctx.userModified === true) {
    out.push({
      eventKey: 'nutrivision_user_refined',
      amount: 1,
      txType: 'earn',
      description: 'Refined NutriVision Meal',
    });
  }

  if (typeof ctx.contributedPhotoPath === 'string' && ctx.contributedPhotoPath.length > 0) {
    out.push({
      eventKey: 'corpus_contribution',
      amount: 1,
      txType: 'earn',
      description: 'Contributed to Accuracy Research',
    });
  }

  return out;
}

/**
 * Awards the four NutriVision Helix events on a meal save. Best effort: each
 * event is inserted independently and a failure on one does not block the
 * others. Returns the awarded set, total points, and per-event errors.
 */
export async function awardNutriVisionHelixEvents(
  ctx: NutriVisionHelixContext,
): Promise<NutriVisionHelixAwards> {
  const pending = buildPending(ctx);
  const awarded: NutriVisionEventKey[] = [];
  const errors: Array<{ event: string; error_class: string }> = [];
  let totalPoints = 0;

  for (const p of pending) {
    try {
      // Phase 1q hotfix 2: helix_transactions.source is NOT NULL; match the
      // engine convention (source = event key) used by earning-engine.ts and
      // token-engine.ts. The per-event key (e.g. 'nutrivision_meal_logged')
      // is the canonical value here.
      const builder = ctx.supabaseAdmin.from('helix_transactions').insert({
        user_id: ctx.userId,
        amount: p.amount,
        type: p.txType,
        source: p.eventKey,
        description: p.description,
        event_type_id: p.eventKey,
        metadata: {
          event_key: p.eventKey,
          related_meal_id: ctx.mealId,
          source: 'nutrivision',
        },
      });
      const result = await withTimeout(
        Promise.resolve(builder) as Promise<{ error: { message: string } | null }>,
        {
          timeoutMs: HELIX_INSERT_TIMEOUT_MS,
          op: `helix.award.${p.eventKey}`,
          requestId: ctx.requestId,
        },
      );

      if (result.error) {
        errors.push({ event: p.eventKey, error_class: 'SupabaseError' });
        safeLog.warn('nutrition.helix.award_failed', 'insert returned error', {
          request_id: ctx.requestId,
          event_key: p.eventKey,
          error: result.error.message,
        });
        continue;
      }

      awarded.push(p.eventKey);
      totalPoints += p.amount;
    } catch (err) {
      errors.push({ event: p.eventKey, error_class: classifyError(err) });
      safeLog.warn('nutrition.helix.award_failed', 'insert threw', {
        request_id: ctx.requestId,
        event_key: p.eventKey,
        error: err,
      });
    }
  }

  safeLog.info('nutrition.helix.nutrivision_awarded', 'awards processed', {
    request_id: ctx.requestId,
    meal_id: ctx.mealId,
    events: awarded,
    total_points: totalPoints,
    error_count: errors.length,
  });

  return { awarded, totalPoints, errors };
}

// ---------------------------------------------------------------------------
// Prompt #170a supplement §16: Quick Log Helix parity.
//
// Mirror of awardNutriVisionHelixEvents for the Quick Log channel. The three
// rows in helix_earning_event_types were inserted live this turn:
//   quick_log_meal_logged           5 points (always)
//   quick_log_high_completeness     2 points (all four macros AND a cooking
//                                              annotation present)
//   quick_log_meal_refined          1 point  (user_modified true; for Quick
//                                              Log inputs this is always true)
//
// Same shape as the NutriVision path post hotfix 5: helix_transactions
// type='earn', source=event_key, event_type_id=event_key, metadata.event_key.
// Consumer portal only per Standing Rule 11. Practitioner views never see
// these rows.
// ---------------------------------------------------------------------------

export type QuickLogEventKey =
  | 'quick_log_meal_logged'
  | 'quick_log_high_completeness'
  | 'quick_log_meal_refined';

export interface QuickLogHelixContext {
  supabaseAdmin: SupabaseClient;
  userId: string;
  mealId: string;
  hasAllFourMacros: boolean;
  hasCookingAnnotation: boolean;
  userModified: boolean;
  requestId: string;
}

export interface QuickLogHelixAwards {
  awarded: ReadonlyArray<QuickLogEventKey>;
  totalPoints: number;
  errors: ReadonlyArray<{ event: string; error_class: string }>;
}

interface PendingQuickLogAward {
  eventKey: QuickLogEventKey;
  amount: number;
  txType: 'earn';
  description: string;
}

function buildPendingQuickLog(ctx: QuickLogHelixContext): PendingQuickLogAward[] {
  const out: PendingQuickLogAward[] = [
    {
      eventKey: 'quick_log_meal_logged',
      amount: 5,
      txType: 'earn',
      description: 'Quick Log Meal Logged',
    },
  ];

  if (ctx.hasAllFourMacros === true && ctx.hasCookingAnnotation === true) {
    out.push({
      eventKey: 'quick_log_high_completeness',
      amount: 2,
      txType: 'earn',
      description: 'High Completeness Quick Log Meal',
    });
  }

  if (ctx.userModified === true) {
    out.push({
      eventKey: 'quick_log_meal_refined',
      amount: 1,
      txType: 'earn',
      description: 'Refined Quick Log Meal',
    });
  }

  return out;
}

/**
 * Awards the Quick Log Helix events on a meal save. Best effort: each event
 * is inserted independently and a failure on one does not block the others.
 * Returns the awarded set, total points, and per-event errors.
 */
export async function awardQuickLogHelixEvents(
  ctx: QuickLogHelixContext,
): Promise<QuickLogHelixAwards> {
  const pending = buildPendingQuickLog(ctx);
  const awarded: QuickLogEventKey[] = [];
  const errors: Array<{ event: string; error_class: string }> = [];
  let totalPoints = 0;

  for (const p of pending) {
    try {
      const builder = ctx.supabaseAdmin.from('helix_transactions').insert({
        user_id: ctx.userId,
        amount: p.amount,
        type: p.txType,
        source: p.eventKey,
        description: p.description,
        event_type_id: p.eventKey,
        metadata: {
          event_key: p.eventKey,
          related_meal_id: ctx.mealId,
          source: 'quick_log',
        },
      });
      const result = await withTimeout(
        Promise.resolve(builder) as Promise<{ error: { message: string } | null }>,
        {
          timeoutMs: HELIX_INSERT_TIMEOUT_MS,
          op: `helix.award.${p.eventKey}`,
          requestId: ctx.requestId,
        },
      );

      if (result.error) {
        errors.push({ event: p.eventKey, error_class: 'SupabaseError' });
        safeLog.warn('nutrition.helix.award_failed', 'insert returned error', {
          request_id: ctx.requestId,
          event_key: p.eventKey,
          error: result.error.message,
        });
        continue;
      }

      awarded.push(p.eventKey);
      totalPoints += p.amount;
    } catch (err) {
      errors.push({ event: p.eventKey, error_class: classifyError(err) });
      safeLog.warn('nutrition.helix.award_failed', 'insert threw', {
        request_id: ctx.requestId,
        event_key: p.eventKey,
        error: err,
      });
    }
  }

  safeLog.info('nutrition.helix.quick_log_awarded', 'awards processed', {
    request_id: ctx.requestId,
    meal_id: ctx.mealId,
    events: awarded,
    total_points: totalPoints,
    error_count: errors.length,
  });

  return { awarded, totalPoints, errors };
}
