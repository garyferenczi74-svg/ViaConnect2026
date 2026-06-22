// Prompt 208b Task 4.6-T2: active-compound (stimulant) load engine.
//
// Aggregates caffeine across food/drink (Gordon meal_items.caffeine_mg) and
// supplements (Hannah via masterFormulations ingredient name match on the
// user's current stack), contextualized by CYP1A2 metabolism genetics
// (rs762551: A = rapid *1A allele, C = slow *1F allele).
//
// NOTE: the sleep/heart-rate cross-check is Connected (FLAG-OFF) and is
// therefore DEGRADED in this engine. Sleep and heart-rate data are not read
// or computed here. When that connector goes live, a caller should retrieve
// CaffeineTimingSource (src/lib/scoring/sources/caffeine-timing-source.ts)
// and pass it as supplementary context. No fabrication; the fields simply
// remain absent from this output.
//
// All reads are best-effort: any failure degrades that source to 0 (or
// 'unknown' for the genotype) and the function NEVER throws. Persist failure
// is also fail-open: the CompoundLoad object is returned regardless.
//
// No em/en-dashes. No emojis.

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { getQualifiedUserVariants } from '@/lib/genetics/qc/qualifiedVariants';
import { normalizeGenotype } from '@/lib/genetics/variantSeverity';
import { MASTER_FORMULATIONS } from '@/data/masterFormulations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** CYP1A2 metabolizer phenotype derived from rs762551 genotype. */
export type Cyp1a2Metabolizer = 'rapid' | 'intermediate' | 'slow' | 'unknown';

/** The aggregated daily compound load for one user and one compound. */
export interface CompoundLoad {
  compound: string;
  /** Caffeine from food/drink (meal_items.caffeine_mg) in mg. */
  foodSourceTotal: number;
  /** Caffeine from supplements (masterFormulations ingredient scan) in mg. */
  supplementSourceTotal: number;
  /** food + supplement, in mg. */
  total: number;
  /** CYP1A2 metabolizer phenotype from rs762551. */
  metabolizerContext: Cyp1a2Metabolizer;
}

// ---------------------------------------------------------------------------
// cyp1a2Context -- PURE
// ---------------------------------------------------------------------------

/**
 * Map an rs762551 genotype string to a CYP1A2 metabolizer phenotype.
 * A = rapid allele (*1A), C = slow allele (*1F).
 *   AA  -> rapid
 *   AC / CA -> intermediate
 *   CC  -> slow
 *   anything else / null -> unknown
 * Normalization: uppercase, strip separators (as in normalizeGenotype).
 */
export function cyp1a2Context(rs762551Genotype: string | null): Cyp1a2Metabolizer {
  if (rs762551Genotype === null || rs762551Genotype === '') return 'unknown';
  const normalized = normalizeGenotype(rs762551Genotype);
  if (normalized === 'AA') return 'rapid';
  if (normalized === 'AC' || normalized === 'CA') return 'intermediate';
  if (normalized === 'CC') return 'slow';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// assessCaffeineLoad -- PURE
// ---------------------------------------------------------------------------

/**
 * Classify a caffeine load by total mg and annotate for slow-metabolizer caution.
 * Thresholds (informational, not medical advice):
 *   < 200 mg  -> low
 *   200-400 mg -> moderate
 *   > 400 mg  -> high
 * slowMetabolizerCaution = true only when metabolizer is 'slow' AND total >= 200.
 */
export function assessCaffeineLoad(
  total: number,
  metabolizer: Cyp1a2Metabolizer,
): { level: 'low' | 'moderate' | 'high'; slowMetabolizerCaution: boolean } {
  const level: 'low' | 'moderate' | 'high' =
    total < 200 ? 'low' : total <= 400 ? 'moderate' : 'high';
  const slowMetabolizerCaution = metabolizer === 'slow' && total >= 200;
  return { level, slowMetabolizerCaution };
}

// ---------------------------------------------------------------------------
// Internal readers (best-effort, fail-open)
// ---------------------------------------------------------------------------

/** Sum caffeine_mg from meal_items for the user today (last 24 hours). Fail-open 0. */
async function readFoodCaffeineMg(userId: string): Promise<number> {
  try {
    const supabase = createAdminClient();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('meal_items')
      .select('caffeine_mg, meals!inner(logged_at, user_id)')
      .eq('meals.user_id', userId)
      .gt('caffeine_mg', 0)
      .gte('meals.logged_at', cutoff);

    if (error) {
      safeLog.warn('compoundLoad', 'meal_items caffeine read failed; degrading to 0', {
        userId,
        error,
      });
      return 0;
    }

    let total = 0;
    for (const row of (data ?? []) as Array<{ caffeine_mg?: number | string | null }>) {
      const mg = Number(row.caffeine_mg);
      if (Number.isFinite(mg) && mg > 0) total += mg;
    }
    return Math.round(total * 100) / 100;
  } catch (err) {
    safeLog.warn('compoundLoad', 'meal_items caffeine query threw; degrading to 0', {
      userId,
      err,
    });
    return 0;
  }
}

/**
 * Sum caffeine from the user's current supplement stack.
 * Strategy: read user_current_supplements (supplement_name = product slug or name),
 * resolve each to a masterFormulations entry via getFormulationByName, then sum
 * ingredients whose name contains 'caffeine' (case-insensitive). Fail-open 0.
 *
 * NOTE: as of the 208b Task 4.6-T2 ship date, no MASTER_FORMULATIONS entry
 * carries an ingredient explicitly named 'caffeine' (the FOCUS+ formula uses
 * paraxanthine/enfinity(R) as the stimulant, not caffeine). This path returns
 * 0 for the current catalog. It will self-activate if a future product adds a
 * 'Caffeine' ingredient row. Wired but currently inert.
 */
async function readSupplementCaffeineMg(userId: string): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('user_current_supplements')
      .select('supplement_name')
      .eq('user_id', userId)
      .eq('is_current', true);

    if (error) {
      safeLog.warn('compoundLoad', 'user_current_supplements read failed; degrading to 0', {
        userId,
        error,
      });
      return 0;
    }

    const names = ((data ?? []) as Array<{ supplement_name?: string | null }>)
      .map((r) => r.supplement_name)
      .filter((n): n is string => typeof n === 'string' && n.length > 0);

    let total = 0;
    for (const name of names) {
      // Try slug match first, then name match.
      const formulation =
        MASTER_FORMULATIONS.find((f) => f.slug === name) ??
        MASTER_FORMULATIONS.find(
          (f) => f.name.toLowerCase() === name.toLowerCase(),
        );

      if (!formulation) continue;

      for (const ingredient of formulation.ingredients) {
        if (!ingredient.name.toLowerCase().includes('caffeine')) continue;
        const mg = parseFloat(ingredient.mgPerServing);
        if (Number.isFinite(mg) && mg > 0) total += mg;
      }
    }

    return Math.round(total * 100) / 100;
  } catch (err) {
    safeLog.warn('compoundLoad', 'supplement caffeine query threw; degrading to 0', {
      userId,
      err,
    });
    return 0;
  }
}

/** Read the user's rs762551 genotype from qualified variants. Fail-open null. */
async function readRs762551Genotype(userId: string): Promise<string | null> {
  try {
    const variants = await getQualifiedUserVariants(userId);
    const row = variants.find((v) => v.rsid === 'rs762551');
    return row?.genotype ?? null;
  } catch (err) {
    safeLog.warn('compoundLoad', 'rs762551 genotype read failed; metabolizer unknown', {
      userId,
      err,
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// computeAndPersistCompoundLoad
// ---------------------------------------------------------------------------

/**
 * Compute and persist an active-compound load row for the user.
 *
 * Sources:
 *   - foodSourceTotal: meal_items.caffeine_mg for the last 24 hours (Gordon).
 *     WIRED.
 *   - supplementSourceTotal: masterFormulations ingredient scan on the user's
 *     current stack (Hannah). WIRED but currently 0 for all existing catalog
 *     products (no product carries an explicit 'Caffeine' ingredient).
 *   - metabolizerContext: rs762551 from getQualifiedUserVariants. WIRED.
 *   - Sleep/heart-rate cross-check: Connected (FLAG-OFF). DEGRADED. Not
 *     computed here. See CaffeineTimingSource in caffeine-timing-source.ts
 *     for the sleep-window model when that connector activates.
 *
 * Fail-open: any read failure degrades that source to 0 / 'unknown'. Persist
 * failure is logged but does not block the return. Never throws.
 *
 * @param userId The authenticated user ID.
 * @param compound Compound label; defaults to 'caffeine'.
 */
export async function computeAndPersistCompoundLoad(
  userId: string,
  compound = 'caffeine',
): Promise<CompoundLoad> {
  // -------------------------------------------------------------------------
  // Read all sources in parallel, best-effort.
  // -------------------------------------------------------------------------
  const [foodSourceTotal, supplementSourceTotal, rs762551] = await Promise.all([
    readFoodCaffeineMg(userId),
    readSupplementCaffeineMg(userId),
    readRs762551Genotype(userId),
  ]);

  const total = foodSourceTotal + supplementSourceTotal;
  const metabolizerContext = cyp1a2Context(rs762551);

  // -------------------------------------------------------------------------
  // Persist (fail-open).
  // -------------------------------------------------------------------------
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('active_compound_load').insert({
      user_id: userId,
      compound,
      food_source_total: foodSourceTotal,
      supplement_source_total: supplementSourceTotal,
      total,
      metabolizer_context: metabolizerContext,
    });
    if (error) {
      safeLog.warn('compoundLoad', 'active_compound_load insert failed (fail-open)', {
        userId,
        error,
      });
    }
  } catch (err) {
    safeLog.warn('compoundLoad', 'active_compound_load insert threw (fail-open)', {
      userId,
      err,
    });
  }

  return { compound, foodSourceTotal, supplementSourceTotal, total, metabolizerContext };
}
