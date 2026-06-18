// Prompt 204b (2026-06-17): read endpoint for the My Genetics "Your Variants"
// surface. Returns the member's interpreted variants grouped by panel plus the
// set of panels backed by a Farmceutica branded test (for dynamic button
// labeling). Owner-scoped via RLS; fail-open to an empty payload.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { getBrandedPanelKeys } from '@/lib/genetics/brandedProvenance';
import type { PanelKey } from '@/lib/genetics/panelLabels';

interface VariantRow {
  panel_key: PanelKey;
  rsid: string;
  gene: string | null;
  genotype: string | null;
  status: string | null;
  clinical_significance: string | null;
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
      .select('panel_key, rsid, gene, genotype, status, clinical_significance')
      .eq('user_id', user.id)
      .order('panel_key', { ascending: true });

    if (error) {
      safeLog.warn('api.genetics.variants', 'read failed (returning empty)', {
        user_id: user.id, error: error.message,
      });
      return NextResponse.json({ variantsByPanel: {}, brandedPanels: [], totalVariants: 0 });
    }

    const rows = (data ?? []) as VariantRow[];
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
