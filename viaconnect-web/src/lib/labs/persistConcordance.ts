// Prompt 208a Module E (E4b): compute + persist genotype-phenotype concordance.
//
// Isolated, fail-open helper so synthesis can enrich its output with concordance
// context via a single additive call without taking on any new logic. Reads the
// same QC-gated variants that synthesis uses. NEVER throws (a concordance-persist
// failure must not break synthesis). No em/en-dashes, no emojis.

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { getQualifiedUserVariants } from '@/lib/genetics/qc/qualifiedVariants';
import { loadLabResults } from '@/lib/labs/loadLabResults';
import { buildConcordances, type ConcordanceRecord } from '@/lib/labs/concordance';

/**
 * Compute genotype-phenotype concordance from the user's QC-qualified variants
 * and confirmed lab results, persist them to genotype_phenotype_concordance
 * (fail-open), and return them. Returns [] on any failure.
 */
export async function computeAndPersistConcordance(userId: string): Promise<ConcordanceRecord[]> {
  try {
    // -------------------------------------------------------------------------
    // Step 1: Load QC-qualified variants
    // -------------------------------------------------------------------------
    const variantRows = await getQualifiedUserVariants(userId);
    const variants = (variantRows ?? []).map((v) => ({
      gene: v.gene ?? null,
      status: v.status ?? null,
    }));

    // -------------------------------------------------------------------------
    // Step 2: Load lab results (using admin client)
    // -------------------------------------------------------------------------
    const adminClient = createAdminClient();
    const labRows = await loadLabResults(adminClient, userId);
    if (!labRows || labRows.length === 0) {
      return [];
    }
    const labs = labRows.map((row) => ({
      biomarker: row.name,
      value: row.value,
      range: row.geneticOptimal ?? row.standard ?? null,
    }));

    // -------------------------------------------------------------------------
    // Step 3: Build concordance records (pure engine, never throws)
    // -------------------------------------------------------------------------
    const records = buildConcordances(variants, labs);

    if (records.length === 0) {
      return records;
    }

    // -------------------------------------------------------------------------
    // Step 4: Persist each record to genotype_phenotype_concordance (fail-open)
    // -------------------------------------------------------------------------
    try {
      const rows = records.map((r) => ({
        user_id: userId,
        gene: r.gene,
        biomarker: r.biomarker,
        concordance_state: r.state,
        confidence: r.confidence,
      }));
      const { error } = await adminClient.from('genotype_phenotype_concordance').insert(rows);
      if (error) {
        safeLog.error('concordance', 'Failed to persist genotype_phenotype_concordance', {
          userId,
          error: error.message,
        });
      }
    } catch (err) {
      safeLog.error('concordance', 'genotype_phenotype_concordance insert threw', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // -------------------------------------------------------------------------
    // Step 5: Return records (even if persist failed)
    // -------------------------------------------------------------------------
    return records;
  } catch (err) {
    safeLog.error('concordance', 'computeAndPersistConcordance failed', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
