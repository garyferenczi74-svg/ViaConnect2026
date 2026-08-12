/**
 * Prompt 215: server-side genetic compatibility load for one product + user.
 * No genetics values logged.
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import {
  scoreGeneticCompatibility,
  SEED_RELEVANCE_ROWS,
  type RelevanceRow,
  type UserVariantInput,
} from './compatibility';
import type { CompatibilityResult, CompatibilityState } from './types';
import { getFormulationBySlug } from '@/data/masterFormulations';

export async function loadProductCompatibility(
  productSlug: string,
): Promise<CompatibilityResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const formulation =
      getFormulationBySlug(productSlug) ??
      getFormulationBySlug(productSlug.replace('balance-plus-gut-repair', 'balance-gut-repair'));
    const ingredientNames =
      formulation?.ingredients.map((i) => i.name) ??
      [];

    if (!user) {
      return scoreGeneticCompatibility({
        productSlug,
        productIngredientNames: ingredientNames,
        relevanceRows: SEED_RELEVANCE_ROWS,
        userVariants: [],
        signedIn: false,
        geneticsState: 'signed_out',
      });
    }

    // Relevance map (DB or seed)
    let relevanceRows: RelevanceRow[] = SEED_RELEVANCE_ROWS;
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from('ingredient_snp_relevance')
        .select(
          'ingredient_key, ingredient_label, rsid, gene_symbol, relevance, evidence_grade, framing_key',
        )
        .eq('is_active', true);
      if (Array.isArray(data) && data.length > 0) {
        relevanceRows = data as RelevanceRow[];
      }
    } catch {
      /* seed fallback */
    }

    // User variants: prefer Elysium coverage + elysium interpretations catalog join via user_variants
    let userVariants: UserVariantInput[] = [];
    let geneticsState: CompatibilityState = 'no_data';

    try {
      const admin = createAdminClient();
      const { data: coverage } = await admin
        .from('elysium_upload_coverage')
        .select('mapped_count, pending_count, unknown_count')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const cov = coverage as {
        mapped_count?: number;
        pending_count?: number;
      } | null;

      const { data: variants } = await admin
        .from('user_variants')
        .select('rsid, gene, panel_key')
        .eq('user_id', user.id)
        .limit(200);

      if (Array.isArray(variants) && variants.length > 0) {
        userVariants = variants.map((v) => {
          const row = v as { rsid?: string; gene?: string; panel_key?: string };
          return {
            rsid: row.rsid ?? '',
            gene: row.gene,
            source: 'genex360' as const,
            status: 'interpreted' as const,
          };
        });
        geneticsState = 'full_data';
      } else if (cov && (cov.mapped_count ?? 0) === 0 && (cov.pending_count ?? 0) > 0) {
        geneticsState = 'processing';
      } else if (cov) {
        geneticsState = 'uploaded_only';
        // coverage without user_variants rows: still no scorable variants
        userVariants = [];
        if ((cov.mapped_count ?? 0) > 0) {
          // Use catalog rsids as weak mapped set when user_variants empty
          const { data: catalog } = await admin
            .from('elysium_variant_interpretations')
            .select('rsid, gene_symbol, interpretation_status')
            .eq('interpretation_status', 'interpreted')
            .limit(40);
          if (Array.isArray(catalog)) {
            userVariants = catalog.map((c) => {
              const row = c as { rsid?: string; gene_symbol?: string };
              return {
                rsid: row.rsid ?? '',
                gene: row.gene_symbol,
                source: 'upload' as const,
                status: 'interpreted' as const,
              };
            });
            geneticsState = 'uploaded_only';
          }
        }
      } else {
        geneticsState = 'no_data';
      }
    } catch (err) {
      safeLog.warn('productTabs.compatibility', 'variant load fail-open empty', {
        // no genetics values
        error: err instanceof Error ? err.message : String(err),
      });
      geneticsState = 'no_data';
    }

    return scoreGeneticCompatibility({
      productSlug,
      productIngredientNames: ingredientNames,
      relevanceRows,
      userVariants,
      signedIn: true,
      geneticsState,
    });
  } catch (err) {
    safeLog.warn('productTabs.compatibility', 'outer fail-open signed_out shell', {
      error: err instanceof Error ? err.message : String(err),
    });
    return scoreGeneticCompatibility({
      productSlug,
      productIngredientNames: [],
      relevanceRows: SEED_RELEVANCE_ROWS,
      userVariants: [],
      signedIn: false,
      geneticsState: 'signed_out',
    });
  }
}
