// Prompt 204c (2026-06-18): the confirm step for a PDF-extracted DNA upload.
// The member has reviewed the extracted readings; this endpoint RE-DERIVES the
// interpretation server-side and persists it. It never trusts client-sent gene,
// panel, or clinical text. Two row kinds:
//   - a genotype row (rsid + a 2-base genotype) is re-scored by the deterministic
//     engine, exactly as a raw upload would be;
//   - a methylation-report row (rsid + a +/+ +/- -/- status the lab printed) is
//     re-looked-up by rsID in the methylation map for its gene/panel/clinical,
//     keeping only the verified status.
// Owner-scoped via RLS.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { persistInterpretedVariants } from '@/lib/genetics/dnaUploadStore';
import { analyzeVariants, type ParsedSnpRow, type InterpretedVariant } from '@/lib/genetics/dnaAnalysisEngine';
import { interpretMethylationByRsid } from '@/lib/genetics/extractMethylationReport';
import { PANEL_ORDER, type PanelKey } from '@/lib/genetics/panelLabels';

const MAX_ROWS = 5000;
const GENOTYPE_RE = /^[ACGT]{2}$/i;

interface ConfirmBody {
  rows?: Array<{ rsid?: unknown; genotype?: unknown; status?: unknown }>;
  sourceFilename?: unknown;
  // Prompt 204 (2026-06-21): the per-tab panel scope from the upload tab. When set,
  // only this panel's re-derived variants are saved (defense in depth: the preview
  // was already scoped, this re-applies it server-side).
  panel?: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to save.' }, { status: 401 });
  }

  let body: ConfirmBody;
  try {
    body = (await request.json()) as ConfirmBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const rawRows = Array.isArray(body.rows) ? body.rows.slice(0, MAX_ROWS) : [];
  const genotypeRows: ParsedSnpRow[] = [];
  const methylationVariants: InterpretedVariant[] = [];

  for (const r of rawRows) {
    if (typeof r?.rsid !== 'string') continue;
    // A clean 2-base genotype means a raw-data row: re-score it deterministically.
    if (typeof r.genotype === 'string' && GENOTYPE_RE.test(r.genotype.trim())) {
      genotypeRows.push({ rsid: r.rsid, chromosome: '', position: '', genotype: r.genotype });
      continue;
    }
    // Otherwise a methylation report row: re-derive from the rsID + the status
    // the lab printed (gene/panel/clinical come from the map, not the client).
    const variant = interpretMethylationByRsid(r.rsid, r.status);
    if (variant) methylationVariants.push(variant);
  }

  let interpreted: InterpretedVariant[] = [...analyzeVariants(genotypeRows), ...methylationVariants];

  // Re-apply the per-tab scope server-side so a confirmed save never writes beyond
  // the panel the member uploaded for. An unknown panel value is ignored (no scope).
  const panelRaw = typeof body.panel === 'string' ? body.panel.trim() : '';
  if ((PANEL_ORDER as string[]).includes(panelRaw)) {
    const panelScope = panelRaw as PanelKey;
    interpreted = interpreted.filter((v) => v.panel_key === panelScope);
  }

  if (interpreted.length === 0) {
    return NextResponse.json({ error: 'No variants to save.' }, { status: 400 });
  }

  const sourceFilename = typeof body.sourceFilename === 'string' ? body.sourceFilename.slice(0, 300) : null;

  try {
    const result = await persistInterpretedVariants(supabase, user.id, interpreted, {
      provider: 'pdf_report',
      isFarmceutica: false,
      brandedProductCode: null,
      sourceFilename,
    });
    return NextResponse.json({
      saved: result.variantCount,
      panelCounts: result.panelCounts,
      uploadId: result.uploadId,
    });
  } catch (err) {
    safeLog.error('api.genetics.confirm-variants', 'save failed', {
      user_id: user.id, error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Could not save your variants. Try again.' }, { status: 500 });
  }
}
