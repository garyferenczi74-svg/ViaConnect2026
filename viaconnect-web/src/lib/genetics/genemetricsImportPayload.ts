/**
 * src/lib/genetics/genemetricsImportPayload.ts
 *
 * Pure payload builder for the GENEX360 / Genemetrics variant import.
 *
 * Prompt 210d P0-7b (Gary signed decision 2026-07-07): the genemetrics import
 * redirects from the non-existent genetic_variants table to the live consumer
 * lane user_variants. Key renames come from the P0-7 comparison table
 * (.superpowers/sdd/task-210d-P0-7-report.md):
 *   panel            -> panel_key
 *   clinical_summary -> clinical_significance
 * risk_level and category keep their names once the additive columns land via
 * 20260707160000_prompt_210d_user_variants_risk_category.sql. Values unchanged.
 *
 * Typing choice: types.ts was regenerated in e4b4aca2 BEFORE that migration, so
 * its user_variants Insert type does not yet carry risk_level/category. Rather
 * than any, the insert row is described locally by extending the generated
 * Insert type with the two pending columns (and narrowing the fields this
 * builder always sets to non-null). The local extension is dropped at the next
 * typegen regen per scripts/schema/regen-types.md.
 *
 * Node-safe and pure (no I/O, no Supabase client), so the shape test can import
 * it directly. Rules: no em dashes, no en dashes, no emojis.
 */

import type { Database } from '@/lib/supabase/types';

type UserVariantsInsert = Database['public']['Tables']['user_variants']['Insert'];

/**
 * A single resolved Genemetrics variant, panel-mapped, in source-field shape
 * (before the user_variants key renames). Values here are passed through
 * unchanged by the builder.
 */
export interface GenemetricsVariantInput {
  userId: string;
  panel: string;
  gene: string;
  rsid: string;
  genotype: string;
  riskLevel: string;
  category: string;
  clinicalSummary: string;
}

/**
 * The user_variants insert row for a Genemetrics import. Extends the generated
 * Insert type with the two additive columns pending in typegen, and narrows the
 * columns the builder always populates to non-null so downstream consumers keep
 * exact-string semantics.
 */
export interface GenemetricsVariantRow extends UserVariantsInsert {
  user_id: string;
  panel_key: string;
  gene: string;
  rsid: string;
  genotype: string;
  clinical_significance: string;
  risk_level: string;
  category: string;
}

/**
 * The live user_variants unique key is panel-scoped (user_id, rsid, panel_key);
 * the old (user_id, rsid) key was dropped
 * (20260621050000_genetics_user_variants_panel_scoped_unique.sql), so the
 * import upserts on this key to match sibling writes (dnaUploadStore.ts).
 */
export const GENEMETRICS_USER_VARIANTS_ONCONFLICT = 'user_id,rsid,panel_key';

/** Maps one panel-resolved Genemetrics variant to a user_variants insert row. */
export function buildGenemetricsVariantRow(
  input: GenemetricsVariantInput,
): GenemetricsVariantRow {
  return {
    user_id: input.userId,
    panel_key: input.panel,
    gene: input.gene,
    rsid: input.rsid,
    genotype: input.genotype,
    risk_level: input.riskLevel,
    category: input.category,
    clinical_significance: input.clinicalSummary,
  };
}
