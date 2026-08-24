// Prompt #164: text meal analysis using Gemini 2.5 Flash + USDA FoodData
// Central. Layer 1, Layer 2, Layer 3, insert. One audit row per outcome.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { MealTypeSchema } from '@/lib/nutrition/schema';
import { parseDescriptionWithGemini, estimateItemWithGemini } from '@/lib/nutrition/gemini-client';
import { lookupFood } from '@/lib/nutrition/usda-client';
import { aggregate, type AggregatedItem } from '@/lib/nutrition/aggregate';
import { resolveFatBreakdown } from '@/lib/nutrition/fat-sources';
import { AIRouteError } from '@/lib/errors/classify-ai';
import { recordAudit, newRequestId } from '@/lib/observability/audit-recorder';
import { GEMINI_MODEL } from '@/lib/nutrition/gemini-prompts';
import { estimateCostUsd } from '@/lib/observability/ai-pricing';
// Prompt 177d (Gary 2026-06-06 decision) blessed the text meal channel as
// a first-class scored channel of estimated confidence. The 168c/168d
// unscored lock is lifted by deliberate decision. Meals saved here run
// through Gordon scoring + BOS recompute, write a real quality_score on
// the canonical meals row (source='full_manual'), and feed Today's Meals,
// Daily Macros, the Nutrition Score, the Bio Optimization Score, and
// Helix events like any other scored channel. The Today's Meals "Score
// not available for legacy meal" treatment now keys off quality_score IS
// NULL (the actual legacy marker, applied to pre-177d rows that were
// stored under the prior unscored convention) rather than
// source='full_manual'. Per 177d Step 2, an unknown nutrient must be
// recorded as NULL and excluded from the score math rather than defaulted
// to 0; the meals migration on 2026-06-07 dropped the NOT NULL constraint
// on the 7 macro columns to make that representable. The parser prompt
// rewrite + Gordon unknown-aware scoring + 4/4/9 reconciliation gating +
// visible "Estimated" marker are pending in a follow-up.
//
// The earlier comment attributing the unlock to 173b is corrected: 173b
// was the CAQ interstitial work and did not authorize this. The dual-
// write to nutrition_logs from #168 Apply C is preserved for realtime
// UNION read dedupe; the legacy_nutrition_log_id link still persists.
// Prompt 177d Phase B: SOURCE_CONFIDENCE_DEFAULTS import dropped because
// the text channel now computes confidence per-meal from the 4/4/9
// reconciliation result rather than using a flat 0.90 default.
import { scoreMealForServerInsert } from '@/lib/gordon/scoreMealForServerInsert';
import { recomputeNutritionDimension } from '@/lib/nutrition/bos-bridge';
// Prompt 194 Task 2a: stored kcal is a pure function of stored macros via the
// shared helper; the sourced calorie value is advisory and can only flag a
// divergence, never override the macro-derived figure.
import { reconcileMealKcal } from '@/lib/nutrition/compute-meal-kcal';
// Prompt 194a Task 2: user-facing confidence keys off the 20 percent macros-vs-
// calories reconciliation band (restored from the pre-194 177d behavior), tied
// to ONE shared constant. The 3 kcal kcalRecon guard below is telemetry only.
import { MATCH_CONFIDENCE_LOW_BAND, macroCaloriesReconciled } from '@/lib/nutrition/match-confidence';

export const dynamic = 'force-dynamic';

const ROUTE = '/api/nutrition/analyze-text';
const MIN_LEN = 5;
const MAX_LEN = 2000;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = newRequestId();
  let userId: string | null = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AIRouteError('UNAUTHENTICATED', 'no session', 401, 'Please sign in to log meals.');
    userId = user.id;

    const body = await req.json().catch(() => null);
    if (!body || typeof body.description !== 'string') {
      throw new AIRouteError('INVALID_INPUT', 'invalid body', 400, 'Please describe what you ate.');
    }
    const description: string = body.description.trim();
    if (description.length < MIN_LEN || description.length > MAX_LEN) {
      throw new AIRouteError('INVALID_INPUT', 'len out of range', 400, `Description must be ${MIN_LEN}-${MAX_LEN} characters.`);
    }
    const mealTypeP = MealTypeSchema.safeParse(body.mealType);
    if (!mealTypeP.success) throw new AIRouteError('INVALID_INPUT', 'mealType', 400, 'Pick a meal type.');
    const mealType = mealTypeP.data;
    const loggedAt = typeof body.loggedAt === 'string' && !Number.isNaN(Date.parse(body.loggedAt))
      ? body.loggedAt : new Date().toISOString();

    const { parsed, usage } = await parseDescriptionWithGemini(description);
    if (parsed.items.length === 0) {
      throw new AIRouteError('MALFORMED_RESPONSE', 'no items parsed', 502, 'We could not identify foods. Try being more specific or enter manually.');
    }

    const items: AggregatedItem[] = [];
    for (const item of parsed.items) {
      const usda = await lookupFood(item.name, item.quantity, item.unit, undefined, item.preparation).catch((e) => {
        safeLog.warn('api.nutrition.analyze-text', 'usda lookup failed', { error: e, name: item.name });
        return null;
      });
      let nutrients: AggregatedItem['nutrients'] | null = usda;
      // Prompt 186 Phase 3: a single common-food portion beyond the
      // plausibility bounds (900 kcal / 60 g fat) is re-estimated before
      // display rather than trusted. Fail open: if re-estimation fails the
      // flagged USDA value stays and aggregate() downgrades confidence.
      if (usda?.meta?.plausibilityFlagged === true) {
        safeLog.warn('api.nutrition.analyze-text', 'plausibility bound exceeded; re-estimating item', {
          name: item.name, matched: usda.meta.matchedName,
          calories: usda.calories, total_fat_g: usda.total_fat_g,
        });
        const reEst = await estimateItemWithGemini(item.name, item.quantity, item.unit).catch(() => null);
        if (reEst) nutrients = { ...reEst.nutrients, source: 'gemini_fallback' };
      }
      if (!nutrients) {
        // Prompt 186 incident fix: an estimator failure for ONE item no
        // longer fails the whole meal. The item degrades to UNKNOWN
        // nutrients (null, never 0), the meal saves, and the card shows
        // Unknown tiles with the estimated notice so the user can fill in.
        try {
          const est = await estimateItemWithGemini(item.name, item.quantity, item.unit);
          nutrients = { ...est.nutrients, source: 'gemini_fallback' };
        } catch (estErr) {
          safeLog.warn('api.nutrition.analyze-text', 'estimator failed; item degrades to unknown', {
            name: item.name,
            error: estErr instanceof Error ? estErr.message : String(estErr),
          });
          nutrients = {
            calories: null, protein_g: null, carbs_g: null, total_fat_g: null,
            saturated_fat_g: null, trans_fat_g: null, omega3_g: null,
            sugar_g: null, fiber_g: null, source: 'gemini_fallback',
          };
        }
      }
      items.push({ parsed: item, nutrients });
    }

    const analysis = aggregate(items);
    const latencyMs = Date.now() - startedAt;

    // Prompt 168 Apply C dual-write (preserved) + Prompt 177d (Gary
    // 2026-06-06 decision) Gordon scoring. The 168c/168d unscored lock
    // is lifted by deliberate decision; quality_score carries the
    // Gordon-computed value so Today's Meals + Daily Macros + Dashboard
    // gauge all surface the score for new full_manual rows. Pre-177d
    // NULL-score rows remain the legacy marker.
    //
    // Prompt 173c: meals INSERT runs first (status quo); scoring runs after
    // and UPDATEs the row with the score. Decouples a scoring failure from
    // the meal save so the user never loses a meal because Gordon timed out.
    // console.error on scoring failure surfaces the actual stack in Vercel
    // runtime logs (safeLog.warn was getting swallowed in production).
    // Prompt 177d Phase B (2026-06-07): write the unknown-vs-zero data
    // contract. Sodium is the canonical "not determinable" macro on the
    // text channel because the parser does not extract it from typed
    // input. Per the 177d Step 3 default, store NULL rather than 0 so
    // the score path can skip it and the UI can mark the meal Estimated.
    //
    // Prompt 194 Task 2a: stored calories are the macro-derived value from the
    // shared helper, the single source of truth, always stored. The sourced
    // calorie value (analysis.calories) is advisory: reconcileMealKcal flags a
    // divergence beyond the small rounding tolerance but never overrides the
    // figure. Prompt 194a Task 2: that divergence is a telemetry tripwire only;
    // user-facing confidence keys off the separate 20 percent reconciliation
    // band (macroCaloriesReconciled) below, not off kcalRecon.diverged.
    const mealMacros = {
      proteinG: analysis.protein_g, carbsG: analysis.carbs_g,
      fatG: analysis.total_fat_g, fiberG: analysis.fiber_g,
    };
    const kcalRecon = reconcileMealKcal(mealMacros, analysis.calories);
    const derivedKcal = kcalRecon.storedKcal;
    // macrosKnown still gates confidence: a meal with any unknown macro stays
    // at the low-confidence band with the estimated marker.
    const macrosKnown =
      analysis.calories !== null && analysis.protein_g !== null &&
      analysis.carbs_g !== null && analysis.total_fat_g !== null;

    // Prompt 186: known-ness is computed from the actual analysis instead of
    // hardcoded. A nutrient is known only when its total is non-null (it was
    // extracted or estimated for every item, never zero-coerced).
    const knownNutrients = {
      calories_kcal: analysis.calories !== null,
      protein_g: analysis.protein_g !== null,
      carbs_g: analysis.carbs_g !== null,
      fat_total_g: analysis.total_fat_g !== null,
      fiber_g: analysis.fiber_g !== null,
      sugar_g: analysis.sugar_g !== null,
      sodium_mg: analysis.sodium_mg != null,
    };

    const downgradedByItems = analysis.nutrient_flags?.downgraded === true;
    // Prompt 194a Task 2: restore the pre-194 20 percent macros-vs-calories
    // band as the user-facing confidence gate. The macro-derived calories
    // (derivedKcal, the value stored) must agree with the advisory stated
    // calories within the band. This is NOT the 3 kcal kcalRecon tripwire,
    // which is an engineering guard and stays telemetry only below.
    const reconciliationPassed = macroCaloriesReconciled(derivedKcal, analysis.calories, macrosKnown);
    const reconciliationRatioValue = analysis.calories && analysis.calories > 0
      ? Math.round((derivedKcal / analysis.calories) * 10000) / 10000
      : 0;
    const sourceConfidence = (reconciliationPassed && !downgradedByItems)
      ? 0.65 // macros reconcile within 20 percent + no portion/plausibility downgrade
      : 0.45; // out-of-band reconciliation, unknown macros, or downgraded items

    const prompt177dMeta = {
      version: '194a-2026-06-14',
      prompt_194: true,
      reconciliation: {
        macro_kcal: derivedKcal,
        stated_kcal: analysis.calories,
        ratio: reconciliationRatioValue,
        threshold: MATCH_CONFIDENCE_LOW_BAND,
        passed: reconciliationPassed,
        skipped_unknown_macros: !macrosKnown,
      },
      known_nutrients: knownNutrients,
      nutrient_flags: analysis.nutrient_flags ?? null,
      estimated: true,
    };

    // Prompt 184b: resolve the fat breakdown. The text engine has no added-fat
    // source at log time, so the breakdown is purely intrinsic (saturated from
    // USDA), fat_source_id null. The user can attribute a source later in the UI.
    // Prompt 186: unknown fat passes 0 into the breakdown accounting only;
    // the meals row keeps NULL and knownNutrients excludes it from scoring.
    const fatBreakdown = resolveFatBreakdown({
      intrinsicTotalFatG: analysis.total_fat_g ?? 0,
      intrinsicSaturatedG: analysis.saturated_fat_g ?? 0,
      addedFatG: 0,
      source: null,
    });

    let mealId: string | null = null;
    try {
      const mealsInsert = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('meals' as any)
        .insert({
          user_id: user.id,
          logged_at: loggedAt,
          meal_type: mealType,
          source: 'full_manual',
          source_confidence: sourceConfidence,
          protein_g: analysis.protein_g,
          carbs_g: analysis.carbs_g,
          fat_total_g: analysis.total_fat_g,
          fat_source_id: null,
          fat_breakdown: fatBreakdown,
          fat_quality_contribution: null,
          fiber_g: analysis.fiber_g,
          sugar_g: analysis.sugar_g,
          sodium_mg: analysis.sodium_mg ?? null,
          calories_kcal: derivedKcal,
          calories_auto_calc: true,
          meal_name: analysis.serving_description ?? null,
          notes: analysis.ai_notes ?? null,
          raw_input: { description, ai_model: GEMINI_MODEL, route: ROUTE },
          quality_score: null,
          quality_tier: null,
          score_breakdown: { prompt_177d_meta: prompt177dMeta },
          scored_at: null,
          gordon_version: null,
        })
        .select('meal_id')
        .single();
      if (mealsInsert.error || !mealsInsert.data) {
        safeLog.warn('api.nutrition.analyze-text', 'meals insert failed (continuing to legacy)', {
          error: mealsInsert.error?.message,
        });
      } else {
        const mid = (mealsInsert.data as { meal_id?: string }).meal_id;
        mealId = typeof mid === 'string' ? mid : null;
      }
    } catch (e) {
      safeLog.warn('api.nutrition.analyze-text', 'meals insert threw (continuing to legacy)', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    // Prompt 194 Task 2a: regression tripwire. When the sourced calorie value
    // disagrees with the macro-derived figure (the one stored) by more than the
    // tolerance, log it with the meal id for telemetry. Macro-derived always wins.
    if (kcalRecon.diverged) {
      safeLog.warn('api.nutrition.analyze-text', 'kcal reconciled to macro-derived value', {
        channel: 'text',
        meal_id: mealId,
        advisory_kcal: analysis.calories,
        computed_kcal: derivedKcal,
        macros: {
          protein_g: analysis.protein_g, carbs_g: analysis.carbs_g,
          fat_total_g: analysis.total_fat_g, fiber_g: analysis.fiber_g,
        },
        resolver_tier: analysis.data_source,
        divergence: kcalRecon.divergence,
      });
    }

    // Prompt 173c: score the meal AFTER the row exists, then UPDATE in place.
    // Wrapped tightly so scoring failures never affect the meal save path.
    // scoredForLegacyLog is captured at this scope so the Prompt 173e legacy
    // meal_logs dual-write below can stamp meal_score with the same value.
    let scoredForLegacyLog: Awaited<ReturnType<typeof scoreMealForServerInsert>> | null = null;
    if (mealId !== null) {
      try {
        // Prompt 177d Phase C (2026-06-07): knownNutrients threads
        // through to scoreMeal so the sodium penalty modifier is
        // explicitly marked excluded with the note "Sodium not
        // determinable; excluded from score" rather than silently
        // computed as 0 and labeled "Within sodium guidance". Math is
        // unchanged for the no-penalty case but the breakdown is now
        // honest. sodiumMg still passes 0 for the legacy preview Meal
        // shape; the engine ignores meal.sodiumMg when
        // knownNutrients.sodium_mg is false.
        // Prompt 186: unknown nutrients pass 0 for the legacy numeric shape
        // but knownNutrients marks them excluded so the engine skips them.
        const scored = await scoreMealForServerInsert(supabase, {
          userId: user.id,
          loggedAt,
          mealType,
          source: 'full_manual',
          sourceConfidence,
          proteinG: analysis.protein_g ?? 0,
          carbsG: analysis.carbs_g ?? 0,
          fatTotalG: analysis.total_fat_g ?? 0,
          fatSourceId: null,
          fatBreakdown,
          fiberG: analysis.fiber_g ?? 0,
          sugarG: analysis.sugar_g ?? 0,
          sodiumMg: analysis.sodium_mg ?? 0,
          caloriesKcal: derivedKcal,
          // Prompt 194a Task 5: the kcal IS auto-derived from macros
          // (derivedKcal = computeMealKcal output via reconcileMealKcal), and
          // the meals row stores calories_auto_calc: true. Pass true here so
          // the scorer flag matches the stored value. Inert today because
          // loggedKcal resolves to the same net-carb derivedKcal either way.
          caloriesAutoCalc: true,
          wholeFoodFlag: false,
          mealName: analysis.serving_description ?? null,
          knownNutrients,
        });
        // Preserve prompt_177d_meta on the score_breakdown so the
        // Estimated chip and downstream analytics keep the
        // reconciliation + known_nutrients audit trail after Gordon
        // overwrites with its own breakdown.
        const mergedBreakdown = {
          ...(scored.score_breakdown as Record<string, unknown>),
          prompt_177d_meta: prompt177dMeta,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateRes = await (supabase as any).from('meals').update({
          quality_score: scored.quality_score,
          quality_tier: scored.quality_tier,
          score_breakdown: mergedBreakdown,
          scored_at: scored.scored_at,
          gordon_version: scored.gordon_version,
          fat_quality_contribution: scored.fat_quality_contribution,
        }).eq('meal_id', mealId);
        if (updateRes.error) {
          // eslint-disable-next-line no-console
          console.error('[analyze-text] meals score UPDATE failed', {
            mealId,
            error: updateRes.error.message,
            details: updateRes.error.details,
            hint: updateRes.error.hint,
            code: updateRes.error.code,
          });
        } else {
          scoredForLegacyLog = scored;
        }
      } catch (scoreErr) {
        // eslint-disable-next-line no-console
        console.error('[analyze-text] gordon score threw', {
          mealId,
          message: scoreErr instanceof Error ? scoreErr.message : String(scoreErr),
          stack: scoreErr instanceof Error ? scoreErr.stack : null,
          raw: JSON.stringify(scoreErr, Object.getOwnPropertyNames(scoreErr instanceof Error ? scoreErr : {})),
        });
      }
    }

    const { data: inserted, error: insErr } = await supabase
      .from('nutrition_logs')
      .insert({
        user_id: user.id, logged_at: loggedAt, meal_type: mealType,
        source: 'manual_text', raw_input: description,
        serving_description: analysis.serving_description,
        calories: derivedKcal, protein_g: analysis.protein_g, carbs_g: analysis.carbs_g,
        total_fat_g: analysis.total_fat_g, good_fat_g: null,
        healthy_fat_g: null, saturated_fat_g: analysis.saturated_fat_g,
        sugar_g: analysis.sugar_g, fiber_g: analysis.fiber_g,
        confidence: analysis.confidence, ai_notes: analysis.ai_notes,
        ai_model: GEMINI_MODEL, ai_latency_ms: latencyMs,
        data_source: analysis.data_source, status: 'pending_review',
      })
      .select('id')
      .single();

    if (insErr || !inserted) {
      // Prompt 168 Apply C: rollback orphan meals row if legacy insert failed
      // after the meals insert succeeded. Best effort; log + continue if delete
      // also fails so the user still sees the original AIRouteError.
      if (mealId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await supabase.from('meals' as any).delete().eq('meal_id', mealId);
        } catch (delErr) {
          safeLog.warn('api.nutrition.analyze-text', 'orphan meals delete failed', {
            mealId, error: delErr instanceof Error ? delErr.message : String(delErr),
          });
        }
      }
      throw new AIRouteError('UNKNOWN', `insert failed: ${insErr?.message}`, 500, 'Could not save draft. Try again.');
    }

    // Prompt 168 Apply C: link meals row back to legacy id for dashboard UNION dedupe.
    if (mealId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('meals' as any)
          .update({ legacy_nutrition_log_id: inserted.id })
          .eq('meal_id', mealId);
      } catch (linkErr) {
        safeLog.warn('api.nutrition.analyze-text', 'legacy link update failed', {
          mealId, legacyId: inserted.id,
          error: linkErr instanceof Error ? linkErr.message : String(linkErr),
        });
      }
    }

    // Prompt 177d: BOS recompute so the Dashboard Nutrition gauge picks up
    // the new scored full_manual meal. Best-effort; never fails the response.
    try {
      await recomputeNutritionDimension({ userId: user.id, date: loggedAt });
    } catch (bosErr) {
      safeLog.warn('api.nutrition.analyze-text', 'bos recompute failed', {
        userId: user.id,
        error: bosErr instanceof Error ? bosErr.message : String(bosErr),
      });
    }

    // Prompt 173e (Gary 2026-06-01): legacy meal_logs dual-write so the
    // Dashboard Daily Scores Panel Nutrition gauge picks up the analyze-text
    // save alongside NutriVision (Hotfix 7 #170 Phase 1q established the
    // pattern). meal_logs.meal_score is the per-meal value the panel
    // averages for the today gauge. Wrapped best-effort; never fails the
    // response.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: legacyLogErr } = await (supabase as any)
        .from('meal_logs')
        .insert({
          user_id: user.id,
          meal_type: mealType,
          log_method: 'manual',
          description: description.slice(0, 500),
          calories: derivedKcal,
          protein_g: analysis.protein_g,
          carbs_g: analysis.carbs_g,
          fat_g: analysis.total_fat_g,
          source_app: 'log_a_full_meal',
          logged_at: loggedAt,
          meal_date: loggedAt.slice(0, 10),
          meal_score: scoredForLegacyLog?.quality_score ?? null,
        });
      if (legacyLogErr) {
        safeLog.warn('api.nutrition.analyze-text', 'legacy meal_logs insert failed (continuing)', {
          mealId,
          error: legacyLogErr.message ?? String(legacyLogErr),
        });
      }
    } catch (legacyLogThrew) {
      safeLog.warn('api.nutrition.analyze-text', 'legacy meal_logs insert threw (continuing)', {
        mealId,
        error: legacyLogThrew instanceof Error ? legacyLogThrew.message : String(legacyLogThrew),
      });
    }

    await recordAudit({
      requestId, userId: user.id, route: ROUTE, provider: 'google', model: GEMINI_MODEL,
      outcome: 'success', httpStatus: 200,
      inputChars: description.length, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
      latencyMs, costUsd: estimateCostUsd(GEMINI_MODEL, usage.inputTokens, usage.outputTokens),
    });

    return NextResponse.json({ logId: inserted.id, analysis, requestId });
  } catch (err) {
    const ai = err instanceof AIRouteError ? err
      : new AIRouteError('UNKNOWN', String(err), 500, 'Something went wrong. Try again or enter manually.', err);
    safeLog.warn('api.nutrition.analyze-text', 'failure', { code: ai.code, userId, message: ai.message });
    await recordAudit({
      requestId, userId, route: ROUTE, provider: 'google', model: GEMINI_MODEL,
      outcome: 'failure', errorCode: ai.code, httpStatus: ai.httpStatus,
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: { code: ai.code, message: ai.userMessage, requestId } }, { status: ai.httpStatus });
  }
}
