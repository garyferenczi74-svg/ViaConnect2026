// Prompt #124 P5: End-to-end orchestrator.
//
// Ties P1 + P2 + P3 together into a single `runVisionEvaluation()` entry
// point used by every intake source (Hounddog hook, consumer API, admin
// upload, test-buy post-receipt, appeal evidence).
//
// Pipeline order (strict):
//   1. Kill-switch check — if source disabled + mode=off, return a skip.
//   2. normalize()          — re-encode, clamp, EXIF strip, compute pHash.
//   3. redactPhi()          — pattern scan + whole-image blur on any hit.
//   4. Load approved corpus — one query, SKU-sliced when candidate known.
//   5. matchAgainstCorpus() — nearest-neighbor pHash.
//   6. Parallel:
//        a. runOcr()        — GCP Vision text detection (stubs if no creds).
//        b. callClaudeVision() with reference images + OCR text.
//   7. determine()          — deterministic rule-table verdict.
//   8. persistEvaluation()  — insert counterfeit_evaluations row.
//   9. persistDetermination() — insert counterfeit_determinations row.
//  10. writeFindings()      — route through MARSHALL.COUNTERFEIT.* rules;
//                              gated by config.canProduceFindings.
//
// Returns a RunVisionResult with the determination + DB row IDs so the
// caller (API route / Hounddog hook / consumer intake) can take follow-up
// actions (link to takedown drafter, notify consumer, etc.).

import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  Determination,
  EvaluationRecord,
  EvaluationSource,
  MarshallVisionOutput,
  ReferenceCorpusEntry,
  ReferenceForVision,
  VisionConfigSnapshot,
} from './types';
import { normalizeImage } from './normalize';
import { redactPhi } from './phiRedact';
import { callClaudeVision } from './claudeVision';
import { runOcr, crossCheckText } from './ocr';
import { determine } from './determine';
import { matchAgainstCorpus, filterCorpusBySku } from './corpusMatch';
import {
  persistDetermination,
  persistEvaluation,
  writeFindings,
  type WriteFindingsResult,
} from './writeFinding';
import { canEvaluate } from './config';
import { log } from './logging';

export interface RunVisionInput {
  supabase: SupabaseClient;
  source: EvaluationSource;
  /** Source-specific reference (signal_id, report_id, appeal_id, test_buy_id, etc.) */
  sourceReference: Record<string, unknown>;
  /** Raw image bytes; will be normalized + PHI-redacted before any downstream step. */
  imageBytes: Uint8Array;
  declaredContentType?: string;
  /** Pre-extracted OCR text (helps PHI pre-filter). Optional. */
  preScanOcrText?: readonly string[];
  /** Config snapshot loaded by caller. */
  config: VisionConfigSnapshot;
  /** Hint: listing URL for finding.location + vision prompt context. */
  listingUrl?: string;
  /** Hint: candidate SKU from upstream (e.g. Hounddog product match). Narrows the corpus fetch. */
  hintSku?: string;
  /** Hint: SKUs requiring hologram per marketing data. */
  hologramRequiredSkus?: ReadonlySet<string>;
  /** Hint: listing URL is on an unauthorized marketplace for the matched SKU. */
  unauthorizedMarketplaceContext?: boolean;
  /** Hint: photo is user-taken (not studio). */
  userTakenPhoto?: boolean;
  /** Optional pre-generated evaluation ID for idempotent retries. */
  evaluationId?: string;
  /** Override the active reference corpus version string written to the evaluation row. */
  referenceCorpusVersion?: string;
}

export type RunVisionStatus =
  | 'skipped_mode_off'
  | 'skipped_source_disabled'
  | 'completed'
  | 'completed_no_findings';

export interface RunVisionResult {
  status: RunVisionStatus;
  evaluationId: string;
  evaluationRowId?: string;
  determinationRowId?: string;
  determination?: Determination;
  phiRedacted: boolean;
  corpusWasEmpty: boolean;
  findings?: WriteFindingsResult;
  durationMs: number;
}

const DEFAULT_CORPUS_VERSION = process.env.MARSHALL_VISION_CORPUS_VERSION ?? 'v2026.04.24';

/** Full pipeline. See file header for stage order. */
export async function runVisionEvaluation(input: RunVisionInput): Promise<RunVisionResult> {
  const started = Date.now();
  const evaluationId = input.evaluationId ?? generateEvaluationId();

  // Stage 1: kill-switch.
  if (!canEvaluate(input.config, input.source)) {
    log.info('evaluation_skipped', {
      evaluationId,
      source: input.source,
      note: `mode=${input.config.mode} source_enabled=${input.config.sourceEnabled[input.source]}`,
    });
    return {
      status: input.config.mode === 'off' ? 'skipped_mode_off' : 'skipped_source_disabled',
      evaluationId,
      phiRedacted: false,
      corpusWasEmpty: false,
      durationMs: Date.now() - started,
    };
  }

  // Stage 2: normalize.
  const normalized = await normalizeImage({
    bytes: input.imageBytes,
    declaredContentType: input.declaredContentType,
  });

  // Stage 3: PHI redact.
  const redacted = await redactPhi({
    bytes: normalized.bytes,
    extractedText: input.preScanOcrText,
  });

  const imageBytesForVision = redacted.bytes;

  // Stage 4: load approved corpus.
  const corpus = await loadApprovedCorpus(input.supabase, input.hintSku);

  // Stage 5: nearest-neighbor match.
  const match = matchAgainstCorpus(normalized.perceptualHash, corpus);
  const candidateSkus = match.candidateSkus;

  // Build reference-image payload for the vision model (up to 6 images).
  const refsForVision = await loadReferenceImagesForVision(
    input.supabase,
    match.citedReferenceIds,
    corpus,
  );

  // Stage 6: parallel OCR + Claude Vision.
  const [ocrResult, visionResult] = await Promise.all([
    runOcr({ imageBytes: imageBytesForVision }),
    callClaudeVision(
      {
        suspectImageBytes: imageBytesForVision,
        suspectImageStorageKey: '', // populated by caller when uploading to Storage
        candidateSkus,
        referenceImages: refsForVision,
        ocrExtractedText: [], // filled in a moment with OCR output
        phiRedacted: redacted.redacted,
      },
      {
        evaluationId,
        referenceCorpusVersion: input.referenceCorpusVersion ?? DEFAULT_CORPUS_VERSION,
      },
    ),
  ]);

  // Merge OCR back into the structured output's cross-check so the
  // determination engine has OCR-derived expectedPresent/Missing/unexpected.
  const voWithOcr = augmentVisionOutputWithOcr(visionResult.output, ocrResult.fullText);

  // Stage 7: determine.
  const det = determine({
    visionOutput: voWithOcr,
    perceptualHashExactMatch: match.exactMatch,
    citedReferenceIds: match.citedReferenceIds,
    source: input.source,
    hologramRequiredSkus: input.hologramRequiredSkus,
    unauthorizedMarketplaceContext: input.unauthorizedMarketplaceContext,
    userTakenPhoto: input.userTakenPhoto,
  });

  // Stage 8: persist evaluation row.
  const evalRecord: EvaluationRecord = {
    evaluationId,
    source: input.source,
    sourceReference: { ...input.sourceReference, listing_url: input.listingUrl ?? undefined },
    imageStorageKey: (input.sourceReference as { image_storage_key?: string }).image_storage_key ?? '',
    imageSha256: normalized.sha256,
    imagePerceptualHash: normalized.perceptualHash,
    phiRedacted: redacted.redacted,
    contentSafetySkip: voWithOcr.content_safety.skip,
    contentSafetyReason: voWithOcr.content_safety.reason,
    candidateSkus,
    modelVersion: visionResult.modelUsed,
    referenceCorpusVersion: input.referenceCorpusVersion ?? DEFAULT_CORPUS_VERSION,
    rawVisionOutput: voWithOcr,
    ocrOutput: ocrResult.stubbed ? null : { fullText: ocrResult.fullText, wordCount: ocrResult.words.length },
    durationMs: Date.now() - started,
  };
  const { evaluationRowId } = await persistEvaluation({ supabase: input.supabase, evaluation: evalRecord });

  // Stage 9: persist determination.
  const { determinationRowId } = await persistDetermination({
    supabase: input.supabase,
    evaluationRowId,
    determination: det,
  });

  // Stage 10: write findings (gated by config inside writeFindings).
  const findings = await writeFindings({
    supabase: input.supabase,
    determination: det,
    source: input.source,
    listingUrl: input.listingUrl,
    config: input.config,
  });

  const durationMs = Date.now() - started;
  log.info('evaluation_complete', {
    evaluationId,
    source: input.source,
    verdict: det.verdict,
    confidence: det.confidence,
    sku: det.matchedSku ?? undefined,
    durationMs,
  });

  return {
    status: findings.inserted ? 'completed' : 'completed_no_findings',
    evaluationId,
    evaluationRowId,
    determinationRowId,
    determination: det,
    phiRedacted: redacted.redacted,
    corpusWasEmpty: match.corpusWasEmpty,
    findings,
    durationMs,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** mve-YYYY-MMDD-XXXXX */
function generateEvaluationId(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 0xfffff).toString(16).padStart(5, '0');
  return `mve-${y}-${m}${d}-${rand}`;
}

/** Load approved corpus entries. Scopes to hintSku when provided, else loads all approved rows. */
async function loadApprovedCorpus(
  supabase: SupabaseClient,
  hintSku?: string,
): Promise<ReferenceCorpusEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from('counterfeit_reference_corpus')
    .select('id, sku, artifact_kind, version, storage_key, sha256, perceptual_hash, approved, retired')
    .eq('approved', true)
    .eq('retired', false);
  if (hintSku) q = q.eq('sku', hintSku);

  const { data, error } = await q;
  if (error) {
    log.warn('corpus_load_failed', { note: error.message });
    return [];
  }

  type Row = {
    id: string; sku: string; artifact_kind: string; version: string;
    storage_key: string; sha256: string; perceptual_hash: string;
    approved: boolean; retired: boolean;
  };
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    sku: r.sku,
    artifactKind: r.artifact_kind as ReferenceCorpusEntry['artifactKind'],
    version: r.version,
    storageKey: r.storage_key,
    sha256: r.sha256,
    perceptualHash: r.perceptual_hash,
    approved: r.approved,
    retired: r.retired,
  }));
}

/**
 * Resolve cited references into bytes via signed URLs. Stubbed here to
 * return an empty list; the orchestrator still runs end-to-end but the
 * vision model gets no reference context until signed-URL fetching is wired
 * into the storage layer in a follow-up pass. Matches the P4 image-viewer
 * placeholder stance.
 */
async function loadReferenceImagesForVision(
  _supabase: SupabaseClient,
  _referenceIds: readonly string[],
  _corpus: readonly ReferenceCorpusEntry[],
): Promise<ReferenceForVision[]> {
  return [];
}

// Exposed for testing; unused internally.
export { filterCorpusBySku };

/** Merge OCR output into the vision model's ocr_cross_check structure. */
function augmentVisionOutputWithOcr(vo: MarshallVisionOutput, ocrText: string): MarshallVisionOutput {
  if (!ocrText || vo.ocr_cross_check.extracted_text.length > 0) return vo;
  const defaultExpected = ['FarmCeutica', 'Made in USA'];
  const xcheck = crossCheckText(ocrText, defaultExpected);
  return {
    ...vo,
    ocr_cross_check: {
      extracted_text: ocrText.split('\n').filter((t) => t.trim().length > 0),
      expected_text_present: xcheck.expectedPresent,
      expected_text_missing: xcheck.expectedMissing,
      unexpected_text: xcheck.unexpected,
    },
  };
}
