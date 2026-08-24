// Prompt 204c (2026-06-18): PDF preview endpoint for the DNA upload surface.
// Extracts text from an uploaded genetic report PDF, parses rsID + genotype
// pairs, and runs the deterministic 204b engine to interpret them. It returns a
// PREVIEW only and writes NOTHING: extracted genotypes are health-critical and
// must be verified by the member before they are saved (the confirm step posts
// to /api/genetics/confirm-variants). Fail-open with structured logging.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';
import { extractPdfText, type PdfExtractionResult } from '@/lib/pdf/extractPdfText';
import { parseDnaReportText } from '@/lib/genetics/parseDnaReportText';
import { analyzeVariants } from '@/lib/genetics/dnaAnalysisEngine';
import { extractMethylationFromPdf, mapMethylationRows } from '@/lib/genetics/extractMethylationReport';
import { inMemoryRateLimit } from '@/lib/utils/inMemoryRateLimit';
import { PANEL_ORDER, type PanelKey } from '@/lib/genetics/panelLabels';

export const dynamic = 'force-dynamic';

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

// Bound a single OCR-capable invocation so a large scanned PDF cannot run away.
export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to upload.' }, { status: 401 });
  }

  // Bound how often one member can trigger the expensive extract + OCR path.
  if (!inMemoryRateLimit(`upload-pdf:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many uploads. Please wait a minute and try again.' }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }
  // Prompt 204 (2026-06-21): accept a PDF OR a photo of a report. A PDF tries the
  // text layer first then Gemini vision; an image goes straight to the vision path.
  const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
  const isImage = file.type.startsWith('image/');
  if (!isPdf && !isImage) {
    return NextResponse.json({ error: 'Please upload a PDF or a photo of your report.' }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: 'File too large. Maximum 10 MB.' }, { status: 400 });
  }

  // Prompt 204 (2026-06-21): optional per-tab panel scope. A genotype panel tab
  // sends its panel_key so the verify screen (and the saved rows) cover only that
  // panel; the DNA Test tab sends nothing and every panel is shown.
  const panelRaw = (formData.get('panel') as string | null)?.trim() || '';
  const panelScope: PanelKey | null = (PANEL_ORDER as string[]).includes(panelRaw)
    ? (panelRaw as PanelKey)
    : null;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    // Backstop: extractPdfText is internally bounded, but race it anyway so the
    // route always returns well under maxDuration even if a layer misbehaves.
    let extraction: PdfExtractionResult;
    try {
      extraction = await withTimeout(extractPdfText(buffer), 40_000, 'api.genex.upload-pdf.extract');
    } catch (err) {
      safeLog.warn('api.genex.upload-pdf', 'extraction exceeded budget, treating as unreadable', {
        user_id: user.id, error: err instanceof Error ? err.message : String(err),
      });
      extraction = { text: '', method: 'none' as const, pages: 0, scanned: true };
    }
    const rows = parseDnaReportText(extraction.text);
    let interpreted = analyzeVariants(rows);
    // The verbatim source snippet per rsID, so the verify screen can show the
    // member exactly what was read (catching a neighbouring-column misread).
    const contextByRsid = new Map<string, string>(rows.map((r) => [r.rsid, r.context]));
    let source: 'genotype' | 'methylation_report' = 'genotype';

    // Fallback: no raw rsID + genotype data was found. Many real reports
    // (Doctor's Data, Yasko-style methylation panels) list results by
    // gene/variant name with a +/+ +/- -/- call instead, and are often
    // photographed or scanned. Read the table with Gemini vision and map the
    // gene/variant labels to rsIDs. The lab states the status, so the model
    // reads the table and the deterministic map assigns the panel.
    if (interpreted.length === 0) {
      const mimeType = file.type || 'application/pdf';
      const methInterpreted = mapMethylationRows(await extractMethylationFromPdf(buffer, mimeType));
      if (methInterpreted.length > 0) {
        interpreted = methInterpreted;
        source = 'methylation_report';
        for (const v of methInterpreted) {
          contextByRsid.set(v.rsid, `Reported as ${v.status} on your methylation pathway report`);
        }
      }
    }

    // Per-tab scope: keep only the active panel's variants so the verify screen
    // and the confirmed rows populate just that panel (each tab is its own
    // independent capture). Applied after the methylation fallback so both paths
    // are scoped. The DNA Test tab passes no scope and sees every panel.
    if (panelScope) {
      interpreted = interpreted.filter((v) => v.panel_key === panelScope);
    }

    // readable distinguishes "we read the document but found no known markers"
    // from "we could not read the document at all" (empty extract + no vision
    // result, for example a Gemini outage), so the UI does not show a blank
    // report as if every marker were absent.
    const readable = extraction.text.length > 0 || interpreted.length > 0;

    return NextResponse.json({
      sourceFilename: file.name,
      method: extraction.method,
      scanned: extraction.scanned,
      source,
      readable,
      // The confirm step re-derives interpretation server-side from these rows:
      // a genotype row is re-scored, a methylation row is re-looked-up by rsID.
      rows: interpreted.map((v) => ({ rsid: v.rsid, genotype: v.genotype, status: v.status })),
      // For display only, so the member can verify before saving.
      preview: interpreted.map((v) => ({
        rsid: v.rsid,
        gene: v.gene,
        panel_key: v.panel_key,
        genotype: v.genotype,
        status: v.status,
        clinical_significance: v.clinical_significance,
        context: contextByRsid.get(v.rsid) ?? '',
      })),
      matchedCount: interpreted.length,
    });
  } catch (err) {
    safeLog.error('api.genex.upload-pdf', 'preview failed', {
      user_id: user.id, error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Could not read this PDF. Try another file or enter manually.' }, { status: 500 });
  }
}
