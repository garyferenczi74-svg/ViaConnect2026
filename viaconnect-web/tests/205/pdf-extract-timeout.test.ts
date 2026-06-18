// Prompt 205 (2026-06-18): regression guard for the genetics PDF upload spinner
// that never stopped. Root cause: the upload route awaited extractPdfText with no
// timeout, and the tesseract OCR fallback could hang (createWorker / render /
// recognize). A hang is not a rejection, so the try/catch could not rescue it; on
// the dev server (no maxDuration) the route never returned.
//
// This file proves extractPdfText NEVER hangs and FAILS OPEN when the OCR path
// stalls, plus a source-contract guard so the three timeout call sites cannot be
// silently removed.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// unpdf: text layer is empty (forces the OCR path); render returns a tiny image.
vi.mock('unpdf', () => ({
  getDocumentProxy: vi.fn(async () => ({ numPages: 1 })),
  extractText: vi.fn(async () => ({ text: '' })),
  renderPageAsImage: vi.fn(async () => new Uint8Array([1, 2, 3, 4])),
}));

// tesseract.js: createWorker never resolves, simulating the hang.
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(() => new Promise(() => {})),
}));

const SRC = path.resolve(__dirname, '..', '..', 'src');

afterEach(() => {
  vi.useRealTimers();
});

describe('extractPdfText resilience (Prompt 205)', () => {
  it('fails open (does not hang) when the OCR worker hangs', async () => {
    vi.useFakeTimers();
    const { extractPdfText } = await import('@/lib/pdf/extractPdfText');

    const promise = extractPdfText(Buffer.from('x'));
    // Track settlement without awaiting (which would deadlock under fake timers).
    let settled = false;
    const tracked = promise.then((r) => {
      settled = true;
      return r;
    });

    // Advance past OCR_TOTAL_MS (18s) so the OCR race rejects and we fail open.
    await vi.advanceTimersByTimeAsync(20_000);

    const result = await tracked;
    expect(settled).toBe(true);
    expect(result.method).toBe('none');
    expect(result.text).toBe('');
    expect(result.scanned).toBe(true);
  });
});

describe('timeout call-site contract (Prompt 205)', () => {
  it('extractPdfText bounds the OCR path with withTimeout', () => {
    const file = readFileSync(path.join(SRC, 'lib', 'pdf', 'extractPdfText.ts'), 'utf8');
    expect(file).toContain('withTimeout(ocrPdf(');
    expect(file).toContain("'pdf.extract.ocr'");
  });

  it('the upload route races extractPdfText with withTimeout', () => {
    const file = readFileSync(
      path.join(SRC, 'app', 'api', 'genex', 'upload-pdf', 'route.ts'),
      'utf8',
    );
    expect(file).toContain('withTimeout(extractPdfText(');
  });

  it('the upload page aborts the upload-pdf fetch with withAbortTimeout', () => {
    const file = readFileSync(
      path.join(SRC, 'app', '(app)', '(consumer)', 'genetics', 'upload', 'page.tsx'),
      'utf8',
    );
    expect(file).toContain('withAbortTimeout(');
    expect(file).toContain('/api/genex/upload-pdf');
  });
});
