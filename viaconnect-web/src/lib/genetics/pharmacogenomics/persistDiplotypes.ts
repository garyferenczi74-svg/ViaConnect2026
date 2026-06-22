// Prompt 208a Module B (2026-06-22): compute + persist diplotype calls.
//
// Fail-open helper: a persist failure MUST NOT break synthesis. Never throws.
// Mirrors the pattern in persistPathways.ts.
//
// diplotype_calls columns used: user_id, gene, diplotype, metabolizer_phenotype,
// confidence, evidence_tier, source_atom_ids.
//
// No em/en-dashes. No emojis.

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { getQualifiedUserVariants } from '@/lib/genetics/qc/qualifiedVariants';
import { callAllDiplotypes, type DiplotypeCall } from './diplotype';

/**
 * Compute diplotype calls from the user's qualified variants, persist each to
 * diplotype_calls, and return the calls.
 *
 * Returns [] on any error (fail-open).
 */
export async function computeAndPersistDiplotypes(userId: string): Promise<DiplotypeCall[]> {
  try {
    const variants = await getQualifiedUserVariants(userId);

    // Build rsid -> genotype map from qualified variants.
    const genotypeByRsid: Record<string, string | null> = {};
    for (const v of variants ?? []) {
      genotypeByRsid[v.rsid] = v.genotype ?? null;
    }

    const calls = callAllDiplotypes(genotypeByRsid);
    if (calls.length === 0) return calls;

    // Persist (fail-open; a DB error must not surface to callers).
    try {
      const supabase = createAdminClient();
      const rows = calls.map((c) => ({
        user_id: userId,
        gene: c.gene,
        diplotype: c.diplotype,
        metabolizer_phenotype: c.metabolizer,
        confidence: c.confidence,
        evidence_tier: c.evidenceTier,
        // source_atom_ids: not populated at this panel-based tier; full PharmGKB
        // atom linkage is flag-off and out of scope for this build.
        source_atom_ids: null,
      }));
      const { error } = await supabase.from('diplotype_calls').insert(rows);
      if (error) {
        safeLog.error('diplotypes', 'Failed to persist diplotype_calls', {
          userId,
          error: error.message,
        });
      }
    } catch (err) {
      safeLog.error('diplotypes', 'diplotype_calls insert threw', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return calls;
  } catch (err) {
    safeLog.error('diplotypes', 'computeAndPersistDiplotypes failed', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
