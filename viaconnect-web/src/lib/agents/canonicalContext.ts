/**
 * src/lib/agents/canonicalContext.ts
 *
 * Canonical per-user context builder (Prompt 208a Task K2, 2026-06-22).
 *
 * buildCanonicalContext assembles ONE canonical context from:
 *   - qualified variants (getQualifiedUserVariants)
 *   - health context (getLatestUserHealthContext)
 *   - ancestry (getUserAncestry)
 *   - latest pathway_scores rows (admin read)
 *   - latest genotype_phenotype_concordance rows (admin read)
 *
 * Persists the assembled context to user_context_canonical (fail-open).
 * Returns the CanonicalContext. NEVER throws.
 *
 * No em/en-dashes. No emojis. No new dependencies. No package.json changes.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { getQualifiedUserVariants } from '@/lib/genetics/qc/qualifiedVariants';
import { getLatestUserHealthContext } from '@/lib/protocol/healthContext';
import { getUserAncestry } from '@/lib/genetics/ancestry/populationMatch';
// === PROMPT 208b 5.1 EXTENSION START ===
// Composed engines for the full Section 5 contract. Every one is fail-open;
// see the additive block in buildCanonicalContext where each is wrapped so one
// failing engine leaves its field null/empty and never breaks the build.
import { buildNutrientIntakeLedger } from '@/lib/nutrition/intakeReconciliation';
import { computeAndPersistEnergyBalance } from '@/lib/wellness/energyBalance';
import { computeAndPersistCompoundLoad } from '@/lib/wellness/compoundLoad';
import { computeAndPersistHydrationReconciliation } from '@/lib/wellness/hydrationReconciliation';
import { stableInputsHash, snapshotCorpus } from '@/lib/protocol/recommendationAudit';
// === PROMPT 208b 5.1 EXTENSION END ===

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CanonicalContext {
  variants: Array<{ rsid: string; gene: string | null; status: string | null }>;
  pathways: unknown[];
  concordance: unknown[];
  healthContext: { allergies: string[]; medications: string[]; goals: string[] };
  ancestry: string[];

  // === PROMPT 208b 5.1 EXTENSION START ===
  // The full Section 5 contract: every field below is OPTIONAL and populated
  // best-effort. Existing consumers that only read the fields above are
  // unaffected. Absent/null on any engine failure (fail-open) or on the
  // catastrophic empty-context fallback.

  /** Reconciled per-nutrient daily intake ledger (engine 4.1). [] on failure. */
  nutrition?: { ledger: unknown[] };

  /** The user's current supplement stack (names). [] on failure. */
  supplements?: { stack: string[] };

  /**
   * Connected wearable/biosensor channels. Connected is FLAG-OFF, so every
   * channel is null: this is the DEGRADED state the completeness check (5-T2)
   * reads to know the data is absent. Never fabricated.
   */
  connected?: {
    sleep: number | null;
    activity: number | null;
    hrv: number | null;
    heartRate: number | null;
    glucose: number | null;
  };

  /** Derived wellness signals (engines 4.4 / 4.6 / 4.7). null each on failure. */
  derived?: {
    energyBalance: unknown | null;
    compoundLoad: unknown | null;
    hydration: unknown | null;
  };

  /**
   * Reproducibility provenance. contractVersion is a deterministic hash of the
   * contract inputs (stableInputsHash, no Date/random): the same inputs produce
   * the same version, and it changes when the inputs change (Section 6).
   * snapshotRef is the published-corpus counts or null on failure.
   */
  provenance?: {
    contractVersion: string;
    snapshotRef: { atom_count: number; rule_count: number } | null;
  };
  // === PROMPT 208b 5.1 EXTENSION END ===
}

// The safe empty context returned on any catastrophic failure.
const EMPTY_CONTEXT: CanonicalContext = {
  variants: [],
  pathways: [],
  concordance: [],
  healthContext: { allergies: [], medications: [], goals: [] },
  ancestry: [],
};

// === PROMPT 208b 5.1 EXTENSION START ===
// ---------------------------------------------------------------------------
// readSupplementStack - current supplement names (fail-open [])
// ---------------------------------------------------------------------------

/**
 * Read the user's current supplement stack names from user_current_supplements
 * (is_current = true). Ordered by name so the persisted context is stable for
 * the same stack. Fail-open: returns [] on any read error and never throws.
 */
async function readSupplementStack(userId: string): Promise<string[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await (supabase
      .from('user_current_supplements')
      .select('supplement_name')
      .eq('user_id', userId)
      .eq('is_current', true)
      .order('supplement_name', { ascending: true })
      .limit(500) as unknown as Promise<{
      data: Array<{ supplement_name?: string | null }> | null;
      error: { message: string } | null;
    }>);

    if (error) {
      safeLog.warn('canonicalContext', 'supplement stack read error; using []', {
        userId,
        error: error.message,
      });
      return [];
    }

    const rows = Array.isArray(data) ? data : [];
    return rows
      .map((r) => r.supplement_name)
      .filter((n): n is string => typeof n === 'string' && n.length > 0);
  } catch (err) {
    safeLog.warn('canonicalContext', 'supplement stack read threw; using []', {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
// === PROMPT 208b 5.1 EXTENSION END ===

// ---------------------------------------------------------------------------
// buildCanonicalContext
// ---------------------------------------------------------------------------

/**
 * Assembles ONE canonical per-user context. Single source that agents read.
 * Fail-open: never throws; on any unexpected error returns a valid empty-ish context.
 *
 * @param userId The authenticated user's UUID.
 */
export async function buildCanonicalContext(userId: string): Promise<CanonicalContext> {
  try {
    // -------------------------------------------------------------------------
    // Step 1: Qualified variants (fail-open [])
    // -------------------------------------------------------------------------
    let variants: CanonicalContext['variants'] = [];
    try {
      const rows = await getQualifiedUserVariants(userId);
      variants = rows.map((r) => ({
        rsid: r.rsid,
        gene: r.gene ?? null,
        status: r.status ?? null,
      }));
    } catch (err) {
      safeLog.warn('canonicalContext', 'getQualifiedUserVariants threw; using []', {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    // -------------------------------------------------------------------------
    // Step 2: Health context (already fail-open)
    // -------------------------------------------------------------------------
    let healthContext: CanonicalContext['healthContext'] = {
      allergies: [],
      medications: [],
      goals: [],
    };
    try {
      const hc = await getLatestUserHealthContext(userId);
      healthContext = {
        allergies: hc.allergies,
        medications: hc.medications,
        goals: hc.goals,
      };
    } catch (err) {
      safeLog.warn('canonicalContext', 'getLatestUserHealthContext threw; using empty', {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    // -------------------------------------------------------------------------
    // Step 3: Ancestry (already fail-open [])
    // -------------------------------------------------------------------------
    let ancestry: string[] = [];
    try {
      ancestry = await getUserAncestry(userId);
    } catch (err) {
      safeLog.warn('canonicalContext', 'getUserAncestry threw; using []', {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    // -------------------------------------------------------------------------
    // Step 4: pathway_scores (latest rows for user, fail-open [])
    // -------------------------------------------------------------------------
    let pathways: unknown[] = [];
    try {
      const supabase = createAdminClient();
      const { data, error } = await (supabase
        .from('pathway_scores')
        .select('*')
        .eq('user_id', userId)
        .order('computed_at', { ascending: false })
        .limit(100) as unknown as Promise<{
        data: unknown;
        error: { message: string } | null;
      }>);

      if (error) {
        safeLog.warn('canonicalContext', 'pathway_scores read error; using []', {
          userId,
          error: error.message,
        });
      } else if (data !== null && data !== undefined) {
        pathways = Array.isArray(data) ? data : [data];
      }
    } catch (err) {
      safeLog.warn('canonicalContext', 'pathway_scores threw; using []', {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    // -------------------------------------------------------------------------
    // Step 5: genotype_phenotype_concordance (latest rows for user, fail-open [])
    // -------------------------------------------------------------------------
    let concordance: unknown[] = [];
    try {
      const supabase = createAdminClient();
      const { data, error } = await (supabase
        .from('genotype_phenotype_concordance')
        .select('*')
        .eq('user_id', userId)
        .order('computed_at', { ascending: false })
        .limit(100) as unknown as Promise<{
        data: unknown;
        error: { message: string } | null;
      }>);

      if (error) {
        safeLog.warn('canonicalContext', 'genotype_phenotype_concordance read error; using []', {
          userId,
          error: error.message,
        });
      } else if (data !== null && data !== undefined) {
        concordance = Array.isArray(data) ? data : [data];
      }
    } catch (err) {
      safeLog.warn('canonicalContext', 'genotype_phenotype_concordance threw; using []', {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    // -------------------------------------------------------------------------
    // Step 6: Assemble canonical context
    // -------------------------------------------------------------------------
    const ctx: CanonicalContext = {
      variants,
      pathways,
      concordance,
      healthContext,
      ancestry,
    };

    // === PROMPT 208b 5.1 EXTENSION START ===
    // Step 6b: additively populate the full Section 5 contract by composing the
    // 208b engines. Every engine call is best-effort and individually wrapped:
    // one failing engine leaves its field null/empty and NEVER breaks the build.
    // No engine call may escape this block as a throw (the outer top-level catch
    // is a last resort, not the mechanism that keeps a single bad engine local).

    // 6b.1 nutrition.ledger (engine 4.1). [] on any failure.
    let ledger: unknown[] = [];
    try {
      const rows = await buildNutrientIntakeLedger(userId);
      ledger = Array.isArray(rows) ? rows : [];
    } catch (err) {
      safeLog.warn('canonicalContext', 'buildNutrientIntakeLedger threw; ledger []', {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
    ctx.nutrition = { ledger };

    // 6b.2 supplements.stack (current supplement names). [] on any failure.
    ctx.supplements = { stack: await readSupplementStack(userId) };

    // 6b.3 connected: Connected is FLAG-OFF, so every channel is null. This is
    // the documented DEGRADED state; values are never fabricated.
    ctx.connected = {
      sleep: null,
      activity: null,
      hrv: null,
      heartRate: null,
      glucose: null,
    };

    // 6b.4 derived signals (engines 4.4 / 4.6 / 4.7). null each on failure.
    let energyBalance: unknown | null = null;
    try {
      energyBalance = (await computeAndPersistEnergyBalance(userId)) ?? null;
    } catch (err) {
      safeLog.warn('canonicalContext', 'computeAndPersistEnergyBalance threw; null', {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    let compoundLoad: unknown | null = null;
    try {
      compoundLoad = (await computeAndPersistCompoundLoad(userId)) ?? null;
    } catch (err) {
      safeLog.warn('canonicalContext', 'computeAndPersistCompoundLoad threw; null', {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    let hydration: unknown | null = null;
    try {
      hydration = (await computeAndPersistHydrationReconciliation(userId)) ?? null;
    } catch (err) {
      safeLog.warn('canonicalContext', 'computeAndPersistHydrationReconciliation threw; null', {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
    ctx.derived = { energyBalance, compoundLoad, hydration };

    // 6b.5 provenance. snapshotRef = published-corpus counts (or null).
    // contractVersion = deterministic hash of the contract inputs (no Date/random):
    // same inputs -> same version; changes when inputs change (Section 6).
    let snapshotRef: { atom_count: number; rule_count: number } | null = null;
    try {
      const snap = await snapshotCorpus();
      snapshotRef = snap ? { atom_count: snap.atom_count, rule_count: snap.rule_count } : null;
    } catch (err) {
      safeLog.warn('canonicalContext', 'snapshotCorpus threw; snapshotRef null', {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    let contractVersion = '';
    try {
      contractVersion = stableInputsHash({
        userId,
        variants,
        ledger,
        derived: ctx.derived,
        healthContext,
      });
    } catch (err) {
      safeLog.warn('canonicalContext', 'stableInputsHash threw; contractVersion empty', {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
    ctx.provenance = { contractVersion, snapshotRef };
    // === PROMPT 208b 5.1 EXTENSION END ===

    // -------------------------------------------------------------------------
    // Step 7: Persist to user_context_canonical (fail-open; never blocks return)
    // The widened ctx (existing fields + the additive Section 5 fields) is
    // persisted as one object. Existing fields are unchanged.
    // -------------------------------------------------------------------------
    try {
      const supabase = createAdminClient();
      const { error: insertError } = await supabase
        .from('user_context_canonical')
        .insert({
          user_id: userId,
          context: ctx,
          version: 1,
        });

      if (insertError) {
        safeLog.warn('canonicalContext', 'persist to user_context_canonical failed; context still returned', {
          userId,
          error: insertError.message,
        });
      }
    } catch (err) {
      safeLog.warn('canonicalContext', 'user_context_canonical insert threw; context still returned', {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    return ctx;
  } catch (err) {
    // Top-level catch: something completely unexpected.
    safeLog.error('canonicalContext', 'buildCanonicalContext threw unexpectedly; returning empty context', {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return structuredClone(EMPTY_CONTEXT);
  }
}
