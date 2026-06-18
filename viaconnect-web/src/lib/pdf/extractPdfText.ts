// Prompt 204c (2026-06-18): server-side PDF text extraction. Two layers:
//   1. unpdf reads the digital text layer (the common case for lab and genetic
//      report PDFs).
//   2. When the text layer is empty or sparse (a scanned, image-only PDF), fall
//      back to OCR: render each page to a PNG with unpdf and read it with
//      tesseract.js.
//
// Everything is defensive and fail-open: any failure returns a result with the
// best text obtained (possibly empty) and the method used, so the caller can
// decide how to proceed and never crashes the upload. OCR is capped to the first
// few pages to bound serverless execution time, and the OCR worker is always
// terminated.

import { safeLog } from '@/lib/utils/safe-log';

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

export async function extractPdfText(buffer: Buffer): Promise<PdfExtractionResult> {
  let pages = 0;
  try {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    pages = pdf.numPages ?? 0;
    const { text } = await extractText(pdf, { mergePages: true });
    const merged = Array.isArray(text) ? text.join('\n') : (text ?? '');

    if (merged.trim().length >= MIN_TEXT_CHARS) {
      return { text: merged, method: 'text-layer', pages, scanned: false };
    }

    // Sparse or empty text layer: likely a scanned PDF. Try OCR.
    const ocrText = await ocrPdf(buffer, pages);
    if (ocrText.trim().length > 0) {
      return { text: ocrText, method: 'ocr', pages, scanned: true };
    }

    // Nothing usable either way.
    return { text: merged, method: merged.trim() ? 'text-layer' : 'none', pages, scanned: true };
  } catch (err) {
    safeLog.warn('pdf.extract', 'extraction failed (returning empty)', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { text: '', method: 'none', pages, scanned: false };
  }
}

async function ocrPdf(buffer: Buffer, totalPages: number): Promise<string> {
  const pageCount = Math.min(totalPages || 1, MAX_OCR_PAGES);
  let worker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>> | null = null;
  try {
    const { renderPageAsImage } = await import('unpdf');
    const { createWorker } = await import('tesseract.js');
    worker = await createWorker('eng');

    const parts: string[] = [];
    for (let page = 1; page <= pageCount; page++) {
      try {
        const image = await renderPageAsImage(new Uint8Array(buffer), page, { scale: 2 });
        const { data } = await worker.recognize(Buffer.from(image));
        if (data.text) parts.push(data.text);
      } catch (pageErr) {
        safeLog.warn('pdf.extract', 'ocr page failed (continuing)', {
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
      try { await worker.terminate(); } catch { /* ignore */ }
    }
  }
}
