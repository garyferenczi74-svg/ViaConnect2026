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
// === PROMPT 208b 4.3 EXTENSION START ===
// Triangulated builder + type supersede the 208a buildConcordances import here.
// The pure 208a buildConcordances + ConcordanceRecord remain exported from
// concordance.ts and are reused INSIDE buildTriangulatedConcordances.
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildTriangulatedConcordances,
  type TriangulatedConcordance,
} from '@/lib/labs/concordance';

/**
 * Cheapest read of the user's reported symptoms: the conditions jsonb on the
 * latest user_health_context row (the F2 aggregator stores CAQ health_concerns
 * there). Flattened to a lowercased string[]. Fail-open: returns [] on any error
 * so a missing/odd shape never blocks concordance.
 */
async function loadUserSymptoms(client: SupabaseClient, userId: string): Promise<string[]> {
  try {
    const { data, error } = await (client
      .from('user_health_context')
      .select('conditions')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle() as unknown as Promise<{
      data: { conditions: unknown } | null;
      error: { message: string } | null;
    }>);
    if (error || !data) return [];
    return flattenSymptoms(data.conditions);
  } catch (err) {
    safeLog.warn('concordance', 'symptom read failed - proceeding with no symptoms', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Flatten the conditions/health_concerns jsonb into a flat string[]. Accepts an
 * array of strings, an array of { name | label | concern } objects, or a plain
 * object whose string values are concern terms. Never throws.
 */
function flattenSymptoms(raw: unknown): string[] {
  const out: string[] = [];
  const pushStr = (v: unknown): void => {
    if (typeof v === 'string') {
      const t = v.trim();
      if (t.length > 0) out.push(t);
    }
  };
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string') {
        pushStr(item);
      } else if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        pushStr(o['name']);
        pushStr(o['label']);
        pushStr(o['concern']);
        pushStr(o['symptom']);
      }
    }
  } else if (raw && typeof raw === 'object') {
    for (const v of Object.values(raw as Record<string, unknown>)) {
      if (typeof v === 'string') pushStr(v);
      else if (Array.isArray(v)) for (const x of v) pushStr(x);
    }
  }
  return out;
}
// === PROMPT 208b 4.3 EXTENSION END ===

/**
 * Compute genotype-phenotype concordance from the user's QC-qualified variants
 * and confirmed lab results, persist them to genotype_phenotype_concordance
 * (fail-open), and return them. Returns [] on any failure.
 */
export async function computeAndPersistConcordance(
  userId: string,
): Promise<TriangulatedConcordance[]> {
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
    // Step 3: Load reported symptoms (fail-open []), then build TRIANGULATED
    // concordance records (pure engine, never throws). Confidence is recomputed
    // from the number of concordant dimensions (symptom + biomarker + genotype).
    // === PROMPT 208b 4.3 EXTENSION START ===
    // -------------------------------------------------------------------------
    const userSymptoms = await loadUserSymptoms(adminClient, userId);
    const records = buildTriangulatedConcordances(variants, labs, userSymptoms);
    // === PROMPT 208b 4.3 EXTENSION END ===

    if (records.length === 0) {
      return records;
    }

    // -------------------------------------------------------------------------
    // Step 4: Persist each record to genotype_phenotype_concordance (fail-open),
    // including the additive symptom_ref + concordance_dimensions columns.
    // -------------------------------------------------------------------------
    try {
      const rows = records.map((r) => ({
        user_id: userId,
        gene: r.gene,
        biomarker: r.biomarker,
        concordance_state: r.state,
        confidence: r.confidence,
        // === PROMPT 208b 4.3 EXTENSION START ===
        symptom_ref: r.symptom_ref,
        concordance_dimensions: r.concordance_dimensions,
        // === PROMPT 208b 4.3 EXTENSION END ===
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
