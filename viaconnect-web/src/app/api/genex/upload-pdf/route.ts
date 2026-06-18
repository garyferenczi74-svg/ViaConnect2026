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
import { inMemoryRateLimit } from '@/lib/utils/inMemoryRateLimit';

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

// Bound a single OCR-capable invocation so a large scanned PDF cannot run away.
export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = createClient();
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
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'This endpoint accepts PDF files only.' }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: 'PDF too large. Maximum 10 MB.' }, { status: 400 });
  }

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
    const interpreted = analyzeVariants(rows);
    // The verbatim source snippet per rsID, so the verify screen can show the
    // member exactly what was read (catching a neighbouring-column misread).
    const contextByRsid = new Map(rows.map((r) => [r.rsid, r.context]));

    return NextResponse.json({
      sourceFilename: file.name,
      method: extraction.method,
      scanned: extraction.scanned,
      // The confirm step re-derives interpretation server-side from these rows;
      // it never trusts a client-sent status.
      rows: interpreted.map((v) => ({ rsid: v.rsid, genotype: v.genotype })),
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
