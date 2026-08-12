// Prompt 204b (2026-06-17): read endpoint for the My Genetics "Your Variants"
// surface. Returns the member's interpreted variants grouped by panel plus the
// set of panels backed by a Farmceutica branded test (for dynamic button
// labeling). Owner-scoped via RLS; fail-open to an empty payload.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { getBrandedPanelKeys } from '@/lib/genetics/brandedProvenance';
import { severityFor, methylationSeverityFor } from '@/lib/genetics/variantSeverity';
import type { SeverityTier } from '@/lib/genetics/severity';
import { PANEL_LABELS, type PanelKey } from '@/lib/genetics/panelLabels';

export const dynamic = 'force-dynamic';

// The raw shape selected from user_variants. status is the zygosity notation
// (the genotype chip), kept distinct from severity (the score).
interface DbVariantRow {
  panel_key: PanelKey;
  rsid: string;
  gene: string | null;
  genotype: string | null;
  status: string | null;
  clinical_significance: string | null;
  // Whether this result was seeded as a sample on purchase (vs a real upload).
  // Surfaced so the UI can badge sample results.
  is_sample: boolean;
}

// What the client receives: the db row plus the computed severity tier (Prompt
// 204g). severity is the SCORE, derived from the validated per-genotype source by
// rsID and genotype, NOT from zygosity. It is null when the member's (rsID,
// genotype) has no validated assignment yet (the source ships empty), and the UI
// then shows the neutral unscored fallback.
interface VariantRow extends DbVariantRow {
  severity: SeverityTier | null;
}

export async function GET(): Promise<NextResponse> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // user_variants is a new table not yet in the generated typegen, so cast the
    // client for this read, matching the sibling genetics routes that cast for
    // genetic_variants. Runtime behavior is unchanged; the rows are narrowed to
    // VariantRow below.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('user_variants')
      .select('panel_key, rsid, gene, genotype, status, clinical_significance, is_sample')
      .eq('user_id', user.id)
      .order('panel_key', { ascending: true });

    if (error) {
      safeLog.warn('api.genetics.variants', 'read failed (returning empty)', {
        user_id: user.id, error: error.message,
      });
      return NextResponse.json({ variantsByPanel: {}, brandedPanels: [], totalVariants: 0 });
    }

    const dbRows = (data ?? []) as DbVariantRow[];
    // Assign each variant its severity score from the validated source. Severity
    // is its own field, separate from genotype and the zygosity status; unmapped
    // variants get null (the honest unscored state).
    //
    // Two stored shapes, two validated sources (Prompt 204g):
    //   - DNA-raw uploads store an actual genotype (CT, GG, ...): scored by
    //     severityFor(rsid, genotype) against VARIANT_SEVERITY.
    //   - Methylation-panel rows store an empty genotype and a +/+ +/- zygosity
    //     call in `status`: scored by methylationSeverityFor(rsid, status)
    //     against METHYLATION_SEVERITY, which keys on the zygosity directly.
    // A row never has both, so prefer the genotype score and fall back to the
    // zygosity score; null when neither has a validated tier.
    const rows: VariantRow[] = dbRows.map((row) => ({
      ...row,
      // Coerce a missing or null is_sample to false so the flag is always boolean.
      is_sample: row.is_sample === true,
      // Go-live (2026-06-20): severity is PANEL-SCOPED, so a shared rsID is scored
      // by THIS panel's validated source, never another panel's. Methylation rows
      // fall through to the zygosity path (their panel has no genotype source).
      severity:
        severityFor(PANEL_LABELS[row.panel_key]?.slug ?? null, row.rsid, row.genotype) ??
        methylationSeverityFor(row.rsid, row.status),
    }));
    const variantsByPanel: Partial<Record<PanelKey, VariantRow[]>> = {};
    for (const row of rows) {
      (variantsByPanel[row.panel_key] ??= []).push(row);
    }

    const brandedPanels = await getBrandedPanelKeys(supabase, user.id);

    return NextResponse.json({
      variantsByPanel,
      brandedPanels,
      totalVariants: rows.length,
    });
  } catch (err) {
    safeLog.error('api.genetics.variants', 'threw (fail-open)', {
      user_id: user.id, error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ variantsByPanel: {}, brandedPanels: [], totalVariants: 0 });
  }
}
