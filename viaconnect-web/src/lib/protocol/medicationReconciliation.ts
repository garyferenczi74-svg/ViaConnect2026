/**
 * src/lib/protocol/medicationReconciliation.ts
 *
 * Unified medication reconciliation (Prompt 208b, Task 4.9, 2026-06-22).
 *
 * ONE reconciliation over the user's medications that fans out to all four
 * downstream reads. One source, four reads:
 *
 *   1. nutrition   - drug-nutrient depletion via depletionsForMedications
 *                    (src/lib/protocol/drugNutrientDepletions.ts, 208a F3). WIRED.
 *   2. genetics    - the user's pharmacogenomic metabolizer for the medication's
 *                    primary metabolizing CYP gene, read from diplotype_calls
 *                    (208a B2). WIRED; DEGRADES to null when no call exists.
 *   3. supplements - best-effort interaction-engine results for the medication
 *                    vs the user's current supplement stack
 *                    (src/lib/ai/interaction-engine.ts checkProductInteractions).
 *                    WIRED; DEGRADES to [] when the stack is not cleanly readable.
 *   4. labs        - biomarkers to monitor, DERIVED from the depletions via the
 *                    pure depletionBiomarker map (grounded in biomarkerDictionary
 *                    canonical keys). WIRED.
 *
 * COMPOSITION, NOT REINVENTION: every fan-out reuses an existing engine. The
 * interaction and pgx reads DEGRADE (return empty / null) rather than fabricate
 * when their source is unavailable.
 *
 * PRACTITIONER-FACING ASSEMBLY ONLY: this builds the reconciliation object. It
 * does NOT emit consumer-facing drug dosing guidance, and it makes no change to
 * synthesis or the safety interlocks.
 *
 * FAIL-OPEN CONTRACT: this module NEVER throws. Any error at any step is caught
 * and logged via safeLog; the function returns the best partial result it can
 * (an empty array when the medication source itself is unreadable).
 *
 * No em/en-dashes. No emojis. No new dependencies. No package.json changes.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { getLatestUserHealthContext } from './healthContext';
import { depletionsForMedications } from './drugNutrientDepletions';
import { checkProductInteractions } from '@/lib/ai/interaction-engine';

// ---------------------------------------------------------------------------
// MED_PGX_GENE: well-established medication -> primary metabolizing CYP gene.
//
// Keys are lowercased substrings tested against the (lowercased) medication
// name. Only the three genes the panel-based diplotype engine (208a B2) can
// actually call are referenced: CYP2C19, CYP2D6, CYP2C9. An unknown medication
// resolves to no pgx gene. This is deliberately a curated, conservative list of
// drugs with CPIC-level pharmacogenomic guidance for these enzymes; it is not
// an exhaustive substrate table.
// ---------------------------------------------------------------------------

export const MED_PGX_GENE: Record<string, string> = {
  // CYP2C19 substrates (activation or clearance gated by 2C19).
  clopidogrel: 'CYP2C19', // prodrug; poor metabolizers under-activate it.
  plavix: 'CYP2C19',
  omeprazole: 'CYP2C19',
  esomeprazole: 'CYP2C19',
  pantoprazole: 'CYP2C19',
  lansoprazole: 'CYP2C19',
  escitalopram: 'CYP2C19',
  citalopram: 'CYP2C19',

  // CYP2D6 substrates.
  codeine: 'CYP2D6', // prodrug; ultrarapid -> excess morphine, poor -> no effect.
  tramadol: 'CYP2D6',
  tamoxifen: 'CYP2D6',
  atomoxetine: 'CYP2D6',

  // CYP2C9 substrates.
  warfarin: 'CYP2C9', // dose sensitive to 2C9 + VKORC1.
  celecoxib: 'CYP2C9',
  phenytoin: 'CYP2C9',
};

// ---------------------------------------------------------------------------
// depletionBiomarker: PURE map from a depleted nutrient to the biomarker to
// monitor. The labs fan-out is DERIVED from the nutrition fan-out (depletions).
//
// Keys are matched case-insensitively against the depletedNutrient strings
// emitted by drugNutrientDepletions.ts ('vitamin B12', 'magnesium', 'CoQ10',
// 'potassium'). The returned values are biomarkerDictionary.ts canonical keys
// so a downstream lab read can resolve them. A nutrient with no routine serum
// biomarker (CoQ10) maps to null - we do not invent a lab where none is run
// routinely. Unknown nutrients map to null.
// ---------------------------------------------------------------------------

const NUTRIENT_BIOMARKER: Record<string, string | null> = {
  'vitamin b12': 'vitamin_b12',
  b12: 'vitamin_b12',
  cobalamin: 'vitamin_b12',
  magnesium: 'magnesium',
  potassium: 'potassium',
  folate: 'folate',
  iron: 'iron',
  'vitamin d': 'vitamin_d',
  zinc: 'zinc',
  // CoQ10 has no routine serum lab; explicitly null (not omitted) for clarity.
  coq10: null,
};

export function depletionBiomarker(depletedNutrient: string): string | null {
  const key = (depletedNutrient ?? '').toLowerCase().trim();
  if (!key) return null;
  if (Object.prototype.hasOwnProperty.call(NUTRIENT_BIOMARKER, key)) {
    return NUTRIENT_BIOMARKER[key];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public reconciliation shape.
// ---------------------------------------------------------------------------

export interface MedicationReconciliation {
  medication: string;
  /** Nutrition fan-out: drug-nutrient depletions for this medication. */
  depletions: Array<{ nutrient: string; mechanism: string }>;
  /** Genetics fan-out: the medication's primary metabolizing CYP gene, or null. */
  pgxGene: string | null;
  /** Genetics fan-out: the user's metabolizer_phenotype for pgxGene, or null when no call exists. */
  pgxMetabolizer: string | null;
  /** Supplements fan-out: short interaction notes vs the user's stack ([] when degraded). */
  interactionNotes: string[];
  /** Labs fan-out: biomarkers to monitor, derived from the depletions (deduped). */
  monitorBiomarkers: string[];
}

// ---------------------------------------------------------------------------
// Internal helpers (best-effort, fail-open).
// ---------------------------------------------------------------------------

/**
 * Resolve the primary metabolizing CYP gene for a medication name via the
 * MED_PGX_GENE substring map. Returns the first matching gene, or null. PURE.
 */
function pgxGeneForMedication(medicationName: string): string | null {
  const name = (medicationName ?? '').toLowerCase();
  if (!name.trim()) return null;
  for (const [key, gene] of Object.entries(MED_PGX_GENE)) {
    if (name.includes(key)) return gene;
  }
  return null;
}

/**
 * Read the user's latest diplotype_calls metabolizer_phenotype per gene.
 *
 * Returns a map of gene -> metabolizer_phenotype for every gene that has at
 * least one call row. Best-effort: any failure degrades to an empty map and is
 * logged; this NEVER throws. The genetics fan-out then resolves to null for any
 * gene absent from the map (degrade, do not fabricate).
 */
async function readMetabolizersByGene(userId: string): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (err) {
    safeLog.warn('medReconcile', 'admin client unavailable; pgx metabolizers degraded', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return result;
  }

  // Only the genes the panel-based engine can call are ever referenced.
  const genes = Array.from(new Set(Object.values(MED_PGX_GENE)));

  for (const gene of genes) {
    try {
      const { data, error } = await (supabase
        .from('diplotype_calls')
        .select('gene, metabolizer_phenotype')
        .eq('user_id', userId)
        .eq('gene', gene)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as unknown as Promise<{
        data: { gene?: string; metabolizer_phenotype?: string | null } | null;
        error: { message: string } | null;
      }>);

      if (error || !data) continue;
      const phenotype =
        typeof data.metabolizer_phenotype === 'string' ? data.metabolizer_phenotype : null;
      result[gene] = phenotype;
    } catch (err) {
      safeLog.warn('medReconcile', 'diplotype_calls read threw; gene degraded', {
        userId,
        gene,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}

/**
 * Read the user's current supplement stack (display names) from
 * user_current_supplements where is_current = true.
 *
 * Best-effort: any failure (admin client, query error, throw) degrades to an
 * empty array and is logged. NEVER throws. When the stack is empty or unreadable
 * the interaction fan-out is simply absent (no fabrication).
 */
async function readCurrentStack(userId: string): Promise<string[]> {
  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (err) {
    safeLog.warn('medReconcile', 'admin client unavailable; interaction stack degraded', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }

  try {
    const { data, error } = await (supabase
      .from('user_current_supplements')
      .select('supplement_name')
      .eq('user_id', userId)
      .eq('is_current', true) as unknown as Promise<{
      data: Array<{ supplement_name?: string | null }> | null;
      error: { message: string } | null;
    }>);

    if (error) {
      safeLog.warn('medReconcile', 'user_current_supplements read failed; interactions degraded', {
        userId,
        error: error.message,
      });
      return [];
    }

    return (data ?? [])
      .map((r) => (typeof r.supplement_name === 'string' ? r.supplement_name.trim() : ''))
      .filter((n) => n.length > 0);
  } catch (err) {
    safeLog.warn('medReconcile', 'user_current_supplements query threw; interactions degraded', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Build short interaction-note strings for one medication vs the user's stack,
 * reusing the deterministic checkProductInteractions engine. The collected pgx
 * metabolizers feed the engine's CYP escalation (e.g. CYP2D6 poor escalates a
 * severity). Best-effort and PURE over its inputs; returns [] on any failure.
 */
function interactionNotesFor(
  medication: string,
  stack: string[],
  metabolizersByGene: Record<string, string | null>,
): string[] {
  if (stack.length === 0) return [];
  try {
    // checkProductInteractions reads cypStatusMap by gene name -> status string.
    const cypStatusMap: Record<string, string> = {};
    for (const [gene, phenotype] of Object.entries(metabolizersByGene)) {
      if (typeof phenotype === 'string' && phenotype.length > 0) cypStatusMap[gene] = phenotype;
    }

    const checks = checkProductInteractions(stack, [medication], cypStatusMap);
    return checks.map((c) => {
      const head = `${c.supplement} x ${c.medication} (${c.severity}): ${c.description}`;
      return c.pharmacogenomic_context ? `${head} ${c.pharmacogenomic_context}` : head;
    });
  } catch (err) {
    safeLog.warn('medReconcile', 'interaction check threw; interactions degraded', {
      medication,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

// ---------------------------------------------------------------------------
// reconcileMedications - the unified reconciliation.
// ---------------------------------------------------------------------------

/**
 * Reconcile the user's medications into one MedicationReconciliation per
 * medication, fanning out to nutrition, genetics, supplements, and labs.
 *
 * 1. medications = (await getLatestUserHealthContext(userId)).medications.
 *    Fail-open to [] (the only path that returns an empty reconciliation list).
 * 2. Read the genetics (diplotype_calls) and supplements (current stack) sources
 *    ONCE, up front, best-effort. Both degrade to empty without throwing.
 * 3. For each medication: depletions (nutrition), pgxGene + pgxMetabolizer
 *    (genetics), interactionNotes (supplements), monitorBiomarkers (labs, derived
 *    from the depletions, deduped).
 *
 * NEVER throws. Returns [] only when the medication source is unreadable.
 *
 * @param userId The authenticated user's UUID.
 */
export async function reconcileMedications(
  userId: string,
): Promise<MedicationReconciliation[]> {
  // Step 1: the single medication source. Fail-open to [].
  let medications: string[] = [];
  try {
    const ctx = await getLatestUserHealthContext(userId);
    medications = Array.isArray(ctx?.medications) ? ctx.medications : [];
  } catch (err) {
    safeLog.warn('medReconcile', 'health context read failed; no medications to reconcile', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }

  if (medications.length === 0) return [];

  // Step 2: read the genetics + supplements sources once, best-effort.
  const [metabolizersByGene, stack] = await Promise.all([
    readMetabolizersByGene(userId),
    readCurrentStack(userId),
  ]);

  // Step 3: fan out per medication.
  const reconciliations: MedicationReconciliation[] = [];
  for (const medication of medications) {
    // Nutrition fan-out (pure; survives any admin-client failure above).
    const rawDepletions = depletionsForMedications([medication]);
    const depletions = rawDepletions.map((d) => ({
      nutrient: d.depletedNutrient,
      mechanism: d.mechanism,
    }));

    // Genetics fan-out.
    const pgxGene = pgxGeneForMedication(medication);
    const pgxMetabolizer =
      pgxGene && Object.prototype.hasOwnProperty.call(metabolizersByGene, pgxGene)
        ? metabolizersByGene[pgxGene]
        : null;

    // Supplements fan-out.
    const interactionNotes = interactionNotesFor(medication, stack, metabolizersByGene);

    // Labs fan-out: derived from the depletions, deduped, nulls dropped.
    const monitorBiomarkers = Array.from(
      new Set(
        depletions
          .map((d) => depletionBiomarker(d.nutrient))
          .filter((b): b is string => b !== null),
      ),
    );

    reconciliations.push({
      medication,
      depletions,
      pgxGene,
      pgxMetabolizer,
      interactionNotes,
      monitorBiomarkers,
    });
  }

  return reconciliations;
}
