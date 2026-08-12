// Prompt 204 (2026-06-21): PDF or image preview endpoint for an EpigenHQ
// epigenetic report. Reads the report with Gemini vision, maps the printed labels
// to canonical markers, and returns a PREVIEW only: it writes NOTHING. The
// readouts are health-related and must be verified by the member before they are
// saved (the confirm step posts to /api/genetics/epigenetic/confirm). Fail-open,
// rate limited, and time bounded (vision can be slow).
//
// Standing rules honored: no em or en dashes, TypeScript strict (no any).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeLog } from "@/lib/utils/safe-log";
import { withTimeout } from "@/lib/utils/with-timeout";
import { inMemoryRateLimit } from "@/lib/utils/inMemoryRateLimit";
import {
  extractEpigeneticFromReport,
  mapEpigeneticRows,
} from "@/lib/genetics/extractEpigeneticReport";

export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/heic"];

// Bound a single vision invocation so a large file cannot run away.
export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to upload." }, { status: 401 });
  }

  if (!inMemoryRateLimit(`epigen-upload-pdf:${user.id}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  const name = file.name.toLowerCase();
  const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";
  const isImage = file.type.startsWith("image/");
  if (!isPdf && !isImage) {
    return NextResponse.json(
      { error: "Please upload a PDF or a photo of your report." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum 10 MB." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = ACCEPTED_TYPES.includes(file.type)
      ? file.type
      : isPdf
        ? "application/pdf"
        : "image/jpeg";

    let rawRows: Awaited<ReturnType<typeof extractEpigeneticFromReport>>;
    try {
      rawRows = await withTimeout(
        extractEpigeneticFromReport(buffer, mimeType),
        45_000,
        "api.genetics.epigenetic.upload-pdf.extract",
      );
    } catch (err) {
      safeLog.warn("api.genetics.epigenetic.upload-pdf", "extraction exceeded budget", {
        user_id: user.id,
        error: err instanceof Error ? err.message : String(err),
      });
      rawRows = [];
    }

    const preview = mapEpigeneticRows(rawRows);
    // readable distinguishes "we read the document but matched no known markers"
    // from "we could not read the document at all" (a vision outage), so the UI
    // does not show a blank report as if every marker were absent.
    const readable = rawRows.length > 0;

    return NextResponse.json({
      sourceFilename: file.name,
      source: isPdf ? "pdf_scanned" : "photo",
      readable,
      matchedCount: preview.length,
      // The verify screen renders preview; the confirm step re-derives each row
      // from the marker key it carries, so the unit and display name come from the
      // map and never the page.
      preview,
    });
  } catch (err) {
    safeLog.error("api.genetics.epigenetic.upload-pdf", "preview failed", {
      user_id: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Could not read this file. Try another file." },
      { status: 500 },
    );
  }
}
