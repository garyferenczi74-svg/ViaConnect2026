// Prompt 204b (2026-06-17): read endpoint for the My Genetics "Your Variants"
// surface. Returns the member's interpreted variants grouped by panel plus the
// set of panels backed by a Farmceutica branded test (for dynamic button
// labeling). Owner-scoped via RLS.
//
// Gary 2026-08-23: observed pills register ALL GENEX360 info. Stored panel_key
// aliases (GENEX-M, genex_m, genex-m, and peers) group onto the matching pill.
// HormoneIQ counts DUTCH / hormone marker tables. EpigenHQ counts
// user_epigenetic_markers. 401 and read errors return loadStatus plus UNKNOWN
// counts (null), never a fabricated 0. Marketing catalog sizes are not used.
// This route is read-only: it does not write user_variants.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { severityFor, methylationSeverityFor } from '@/lib/genetics/variantSeverity';
import type { SeverityTier } from '@/lib/genetics/severity';
import { PANEL_LABELS, type PanelKey } from '@/lib/genetics/panelLabels';
import { loadHubVariants } from '@/lib/genetics/loadHubVariants';
import {
  errorHubPayload,
  unauthorizedHubPayload,
  type HubVariantsPayload,
} from '@/lib/genetics/hubVariantsPayload';
import { variantRowChip, type VariantRowChipKind } from '@/lib/genetics/variantRowChip';
import type { VariantProvenance } from '@/lib/genetics/variantProvenance';

export const dynamic = 'force-dynamic';

interface DbVariantRow {
  panel_key: PanelKey;
  rsid: string;
  gene: string | null;
  genotype: string | null;
  status: string | null;
  clinical_significance: string | null;
  is_sample: boolean;
  stored_panel_key?: string | null;
  chip?: VariantRowChipKind;
  provenance?: VariantProvenance | null;
}

interface VariantRow extends DbVariantRow {
  severity: SeverityTier | null;
}

function scoreVariant(row: DbVariantRow): VariantRow {
  const chip =
    row.chip ??
    variantRowChip({
      is_sample: row.is_sample,
      genotype: row.genotype,
      status: row.status,
      stored_panel_key: row.stored_panel_key ?? row.panel_key,
    });
  return {
    ...row,
    is_sample: row.is_sample === true,
    stored_panel_key: row.stored_panel_key ?? row.panel_key,
    chip,
    provenance: row.provenance ?? null,
    severity:
      severityFor(PANEL_LABELS[row.panel_key]?.slug ?? null, row.rsid, row.genotype) ??
      methylationSeverityFor(row.rsid, row.status),
  };
}

function scorePayload(
  payload: HubVariantsPayload<Record<string, unknown> & { panel_key: string }>,
): HubVariantsPayload<VariantRow> {
  const variantsByPanel: HubVariantsPayload<VariantRow>['variantsByPanel'] = {};
  for (const [key, rows] of Object.entries(payload.variantsByPanel)) {
    const panelKey = key as PanelKey;
    variantsByPanel[panelKey] = (rows ?? []).map((row) =>
      scoreVariant({
        panel_key: panelKey,
        rsid: typeof row.rsid === 'string' ? row.rsid : '',
        gene: typeof row.gene === 'string' ? row.gene : null,
        genotype: typeof row.genotype === 'string' ? row.genotype : null,
        status: typeof row.status === 'string' ? row.status : null,
        clinical_significance:
          typeof row.clinical_significance === 'string' ? row.clinical_significance : null,
        is_sample: row.is_sample === true,
        stored_panel_key:
          typeof row.stored_panel_key === 'string' ? row.stored_panel_key : panelKey,
        chip:
          row.chip === 'demo' ||
          row.chip === 'result' ||
          row.chip === 'unanalyzed' ||
          row.chip === 'reference'
            ? row.chip
            : undefined,
        provenance:
          typeof row.provenance === 'object' && row.provenance !== null
            ? (row.provenance as VariantProvenance)
            : null,
      }),
    );
  }
  return {
    ...payload,
    variantsByPanel,
  };
}

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Distinct from honest empty: UNKNOWN counts, not 0.
    return NextResponse.json(unauthorizedHubPayload(), { status: 401 });
  }

  try {
    const payload = await loadHubVariants(supabase, user.id);
    return NextResponse.json(scorePayload(payload));
  } catch (err) {
    safeLog.error('api.genetics.variants', 'threw (UNKNOWN, not empty 0)', {
      user_id: user.id, error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(errorHubPayload(), { status: 500 });
  }
}
