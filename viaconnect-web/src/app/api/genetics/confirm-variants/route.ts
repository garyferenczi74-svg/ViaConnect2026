// Prompt 204c (2026-06-18): the confirm step for a PDF-extracted DNA upload.
// The member has reviewed the extracted readings; this endpoint RE-RUNS the
// deterministic 204b engine server-side from the confirmed (rsid, genotype) rows
// and persists the result. It never trusts a client-sent status or panel; the
// engine re-derives both from the rsID and genotype. Owner-scoped via RLS.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { persistDnaAnalysis } from '@/lib/genetics/dnaUploadStore';
import type { ParsedSnpRow } from '@/lib/genetics/dnaAnalysisEngine';

const MAX_ROWS = 5000;

interface ConfirmBody {
  rows?: Array<{ rsid?: unknown; genotype?: unknown }>;
  sourceFilename?: unknown;
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
  const rows: ParsedSnpRow[] = [];
  for (const r of rawRows) {
    if (typeof r?.rsid === 'string' && typeof r?.genotype === 'string') {
      rows.push({ rsid: r.rsid, chromosome: '', position: '', genotype: r.genotype });
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No variants to save.' }, { status: 400 });
  }

  const sourceFilename = typeof body.sourceFilename === 'string' ? body.sourceFilename.slice(0, 300) : null;

  try {
    const result = await persistDnaAnalysis(supabase, user.id, rows, {
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
