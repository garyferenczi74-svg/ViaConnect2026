// Prompt #124 P2: Google Cloud Vision OCR wrapper.
//
// Parallel-callable alongside the Claude Vision evaluation. Returns the
// raw extracted text plus per-word bounding boxes + confidence so the
// determination engine can cross-check OCR output against label-reference
// templates and feed extracted_text into the Claude Vision user message.
//
// Configuration:
//   - GCP credentials via env: GOOGLE_APPLICATION_CREDENTIALS (service
//     account JSON path) OR inline via MARSHALL_GCP_VISION_KEY / _EMAIL /
//     _PROJECT_ID. All three must be set if the inline path is used.
//   - If neither is configured, runOcr() returns an empty OcrResult with
//     `stubbed: true` — consistent with the collector-gate philosophy from
//     #122: missing credentials never crash the pipeline, they just no-op.
//
// BAA: Google Cloud Vision is covered under the existing #119 vendor
// registry BAA. Do not call in environments where the BAA is not in place.

import type { PhiRedactResult } from './types';

export interface OcrWord {
  text: string;
  confidence: number;
  boundingBox: {
    vertices: Array<{ x: number; y: number }>;
  };
}

export interface OcrResult {
  /** Full extracted text, newline-joined. */
  fullText: string;
  /** Word-level tokens with bounding boxes. Used for region-targeted redaction in follow-ups. */
  words: readonly OcrWord[];
  /** True if OCR was skipped for lack of credentials. */
  stubbed: boolean;
  /** Model identifier from GCP, e.g. "builtin/latest". */
  modelVersion: string;
  durationMs: number;
}

export interface RunOcrInput {
  imageBytes: Uint8Array;
}

const EMPTY_OCR: OcrResult = {
  fullText: '',
  words: [],
  stubbed: true,
  modelVersion: 'stub',
  durationMs: 0,
};

type GcpVisionClient = {
  textDetection: (args: { image: { content: Buffer } }) => Promise<[{
    fullTextAnnotation?: { text?: string };
    textAnnotations?: Array<{
      description?: string;
      confidence?: number;
      boundingPoly?: { vertices?: Array<{ x?: number; y?: number }> };
    }>;
  }]>;
};

let cachedClient: GcpVisionClient | null = null;
let clientInitAttempted = false;

async function getClient(): Promise<GcpVisionClient | null> {
  if (cachedClient) return cachedClient;
  if (clientInitAttempted) return null;
  clientInitAttempted = true;

  const hasCreds =
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS
    || (!!process.env.MARSHALL_GCP_VISION_KEY
        && !!process.env.MARSHALL_GCP_VISION_EMAIL
        && !!process.env.MARSHALL_GCP_VISION_PROJECT_ID);

  if (!hasCreds) return null;

  try {
    // Lazy import keeps @google-cloud/vision off the cold-start critical path
    // when OCR is not used in a given request. We type the module as unknown
    // so tsc doesn't require the types package at compile time in
    // environments where the dep hasn't been installed yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vision: any = await import(/* webpackIgnore: true */ '@google-cloud/vision' as string);
    const ImageAnnotatorClient = vision.ImageAnnotatorClient ?? vision.default?.ImageAnnotatorClient;
    if (!ImageAnnotatorClient) return null;

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      cachedClient = new ImageAnnotatorClient() as unknown as GcpVisionClient;
    } else {
      cachedClient = new ImageAnnotatorClient({
        projectId: process.env.MARSHALL_GCP_VISION_PROJECT_ID,
        credentials: {
          client_email: process.env.MARSHALL_GCP_VISION_EMAIL,
          // Key content is PEM with literal \n; re-materialize.
          private_key: (process.env.MARSHALL_GCP_VISION_KEY ?? '').replace(/\\n/g, '\n'),
        },
      }) as unknown as GcpVisionClient;
    }
    return cachedClient;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('marshall vision ocr: client init failed', err);
    return null;
  }
}

/**
 * Run OCR against the normalized image. Callable in parallel with the Claude
 * Vision evaluation. Never throws: returns `stubbed: true` on any failure so
 * the orchestrator's dependent steps can still proceed.
 */
export async function runOcr(input: RunOcrInput): Promise<OcrResult> {
  const started = Date.now();
  const client = await getClient();
  if (!client) return { ...EMPTY_OCR, durationMs: Date.now() - started };

  try {
    const [response] = await client.textDetection({
      image: { content: Buffer.from(input.imageBytes) },
    });
    const fullText = response.fullTextAnnotation?.text?.trim() ?? '';
    const annotations = response.textAnnotations ?? [];
    // GCP Vision returns the full-block annotation at index 0; individual
    // words follow. Skip the aggregate block.
    const words: OcrWord[] = annotations.slice(1).map((a) => ({
      text: a.description ?? '',
      confidence: typeof a.confidence === 'number' ? a.confidence : 1,
      boundingBox: {
        vertices: (a.boundingPoly?.vertices ?? []).map((v) => ({
          x: typeof v.x === 'number' ? v.x : 0,
          y: typeof v.y === 'number' ? v.y : 0,
        })),
      },
    }));
    return {
      fullText,
      words,
      stubbed: false,
      modelVersion: 'gcp-vision/textDetection',
      durationMs: Date.now() - started,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('marshall vision ocr: textDetection failed', err);
    return { ...EMPTY_OCR, durationMs: Date.now() - started };
  }
}

/**
 * Cross-check extracted OCR text against expected label tokens for a SKU.
 * Returns three buckets for the determination engine:
 *   - expectedPresent: tokens that appeared (match signal)
 *   - expectedMissing: tokens that should appear but did not (mismatch signal)
 *   - unexpected:      tokens that appeared but are not in the expected set
 *                      (anomaly signal — e.g. "Manufactured in China")
 */
export function crossCheckText(
  extracted: string,
  expectedTokens: readonly string[],
  anomalyTokens: readonly string[] = DEFAULT_ANOMALY_TOKENS,
): { expectedPresent: string[]; expectedMissing: string[]; unexpected: string[] } {
  const normalized = extracted.toLowerCase();
  const present: string[] = [];
  const missing: string[] = [];
  for (const tok of expectedTokens) {
    if (normalized.includes(tok.toLowerCase())) present.push(tok);
    else missing.push(tok);
  }
  const unexpected: string[] = [];
  for (const tok of anomalyTokens) {
    if (normalized.includes(tok.toLowerCase())) unexpected.push(tok);
  }
  return { expectedPresent: present, expectedMissing: missing, unexpected };
}

/** Common anomaly phrases indicating counterfeit origin. */
export const DEFAULT_ANOMALY_TOKENS: readonly string[] = [
  'Manufactured in China',
  'Made in Russia',
  'Made in India',
  'For research use only',
  'Research chemical',
  'Not for human consumption',
];

/**
 * Merge OCR output with an earlier PHI scan. If OCR surfaces additional PHI
 * patterns that the caller's extractedText pass missed, callers can use this
 * to re-apply redaction before sending the image to Claude Vision.
 */
export function mergeOcrIntoPhiResult(
  existing: PhiRedactResult,
  ocr: OcrResult,
): { combinedText: string; shouldReapplyRedaction: boolean } {
  const combinedText = [ocr.fullText, existing.note].filter(Boolean).join('\n');
  const shouldReapplyRedaction = !existing.redacted && ocr.fullText.length > 0;
  return { combinedText, shouldReapplyRedaction };
}
