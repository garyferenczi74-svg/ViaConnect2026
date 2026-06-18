// Prompt 204c (2026-06-18): server-side PDF text extraction. Two layers:
//   1. unpdf reads the digital text layer (the common case).
//   2. When the text layer is empty or sparse (a scanned PDF), fall back to OCR
//      (unpdf renders each page to a PNG, tesseract.js reads it).
//
// Prompt 205 fix (2026-06-18): every layer is hard-bounded with withTimeout. A
// hung unpdf load or a hung tesseract OCR worker previously left the upload route
// pending forever (on the dev server, which does not enforce maxDuration), so the
// upload spinner never stopped. A hang is not a rejection, so a try/catch cannot
// rescue it; only a timeout race can. OCR is bounded best-effort: if it does not
// finish within OCR_TOTAL_MS we fail open to manual entry. The worker is always
// terminated (also time-bounded).

import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';

export type PdfExtractionMethod = 'text-layer' | 'ocr' | 'none';

export interface PdfExtractionResult {
  text: string;
  method: PdfExtractionMethod;
  pages: number;
  /** True when the PDF appeared to be scanned (no usable text layer). */
  scanned: boolean;
}

// Below this many characters of text-layer output, treat the PDF as scanned and
// try OCR.
const MIN_TEXT_CHARS = 40;
// OCR is slow (seconds per page). Cap pages so a large scan cannot blow the
// function timeout; report-style PDFs put the data in the first pages.
const MAX_OCR_PAGES = 5;

// Hard timeout bounds (ms). Ordered so the internal worst case (load + text
// layer + ocr total) stays under the route backstop (40s) and the function
// maxDuration (60s).
const PDF_LOAD_MS = 8_000;
const TEXT_LAYER_MS = 8_000;
const OCR_INIT_MS = 12_000;
const OCR_RENDER_MS = 7_000;
const OCR_RECOGNIZE_MS = 9_000;
const OCR_TOTAL_MS = 18_000;

export async function extractPdfText(buffer: Buffer): Promise<PdfExtractionResult> {
  let pages = 0;
  let merged = '';

  // Layer 1: digital text layer, bounded so a hung pdf.js load or extraction
  // cannot stall the request.
  try {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await withTimeout(
      getDocumentProxy(new Uint8Array(buffer)),
      PDF_LOAD_MS,
      'pdf.extract.load',
    );
    pages = pdf.numPages ?? 0;
    const { text } = await withTimeout(
      extractText(pdf, { mergePages: true }),
      TEXT_LAYER_MS,
      'pdf.extract.text-layer',
    );
    merged = Array.isArray(text) ? text.join('\n') : (text ?? '');
    if (merged.trim().length >= MIN_TEXT_CHARS) {
      return { text: merged, method: 'text-layer', pages, scanned: false };
    }
  } catch (err) {
    safeLog.warn('pdf.extract', 'text-layer extraction failed or timed out', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Layer 2: sparse or empty text layer means a scanned PDF. Bounded best-effort
  // OCR: if it does not finish within OCR_TOTAL_MS, fail open.
  try {
    const ocrText = await withTimeout(ocrPdf(buffer, pages), OCR_TOTAL_MS, 'pdf.extract.ocr');
    if (ocrText.trim().length > 0) {
      return { text: ocrText, method: 'ocr', pages, scanned: true };
    }
  } catch (err) {
    safeLog.warn('pdf.extract', 'ocr failed or timed out (continuing)', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Nothing usable either way. Return whatever sparse text we have and mark scanned.
  return {
    text: merged,
    method: merged.trim() ? 'text-layer' : 'none',
    pages,
    scanned: merged.trim().length < MIN_TEXT_CHARS,
  };
}

async function ocrPdf(buffer: Buffer, totalPages: number): Promise<string> {
  const pageCount = Math.min(totalPages || 1, MAX_OCR_PAGES);
  let worker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>> | null = null;
  try {
    const { renderPageAsImage } = await import('unpdf');
    const { createWorker } = await import('tesseract.js');
    worker = await withTimeout(createWorker('eng'), OCR_INIT_MS, 'pdf.ocr.init');

    const parts: string[] = [];
    for (let page = 1; page <= pageCount; page++) {
      try {
        const image = await withTimeout(
          renderPageAsImage(new Uint8Array(buffer), page, { scale: 2 }),
          OCR_RENDER_MS,
          'pdf.ocr.render',
        );
        const { data } = await withTimeout(
          worker.recognize(Buffer.from(image)),
          OCR_RECOGNIZE_MS,
          'pdf.ocr.recognize',
        );
        if (data.text) parts.push(data.text);
      } catch (pageErr) {
        safeLog.warn('pdf.extract', 'ocr page failed or timed out (continuing)', {
          page, error: pageErr instanceof Error ? pageErr.message : String(pageErr),
        });
      }
    }
    return parts.join('\n');
  } catch (err) {
    safeLog.warn('pdf.extract', 'ocr unavailable (continuing without)', {
      error: err instanceof Error ? err.message : String(err),
    });
    return '';
  } finally {
    if (worker) {
      // Bound terminate too, so a hung teardown cannot re-hang the request.
      try { await withTimeout(worker.terminate(), 3_000, 'pdf.ocr.terminate'); } catch { /* ignore */ }
    }
  }
}
