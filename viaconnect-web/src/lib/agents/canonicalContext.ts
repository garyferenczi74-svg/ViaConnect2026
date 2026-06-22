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

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CanonicalContext {
  variants: Array<{ rsid: string; gene: string | null; status: string | null }>;
  pathways: unknown[];
  concordance: unknown[];
  healthContext: { allergies: string[]; medications: string[]; goals: string[] };
  ancestry: string[];
}

// The safe empty context returned on any catastrophic failure.
const EMPTY_CONTEXT: CanonicalContext = {
  variants: [],
  pathways: [],
  concordance: [],
  healthContext: { allergies: [], medications: [], goals: [] },
  ancestry: [],
};

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

    // -------------------------------------------------------------------------
    // Step 7: Persist to user_context_canonical (fail-open; never blocks return)
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
