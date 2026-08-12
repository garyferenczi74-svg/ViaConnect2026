// Prompt 204c lab surface (2026-06-18): PDF preview endpoint for lab reports.
// Extracts text and parses biomarker rows for the member to verify. Returns a
// PREVIEW only and writes NOTHING; the confirm step posts to /api/labs/confirm.
// Fail-open, rate limited, and time bounded (OCR can be slow).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { extractPdfText } from '@/lib/pdf/extractPdfText';
import { parseLabReportText } from '@/lib/labs/parseLabReportText';
import { inMemoryRateLimit } from '@/lib/utils/inMemoryRateLimit';

export const dynamic = 'force-dynamic';

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to upload.' }, { status: 401 });
  }

  if (!inMemoryRateLimit(`labs-upload-pdf:${user.id}`, 10, 60_000)) {
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
    const extraction = await extractPdfText(buffer);
    const biomarkers = parseLabReportText(extraction.text);

    return NextResponse.json({
      sourceFilename: file.name,
      method: extraction.method,
      scanned: extraction.scanned,
      matchedCount: biomarkers.length,
      biomarkers,
    });
  } catch (err) {
    safeLog.error('api.labs.upload-pdf', 'preview failed', {
      user_id: user.id, error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Could not read this PDF. Try another file or enter manually.' }, { status: 500 });
  }
}
