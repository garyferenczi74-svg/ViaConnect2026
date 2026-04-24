// Prompt #124 P1: Marshall Vision shared types.
//
// Pure TypeScript, zero runtime deps. Safe to import from client, server,
// and edge contexts. Every downstream module consumes these.

// ─── Verdict + confidence tiers ─────────────────────────────────────────────

export const VERDICTS = [
  'authentic',
  'counterfeit_suspected',
  'unauthorized_channel_suspected',
  'inconclusive',
  'unrelated_product',
  'insufficient_image_quality',
  'content_safety_skip',
] as const;
export type Verdict = (typeof VERDICTS)[number];

export const SOURCES = [
  'hounddog_marketplace',
  'hounddog_social',
  'practitioner_appeal',
  'consumer_report',
  'admin_upload',
  'test_buy',
] as const;
export type EvaluationSource = (typeof SOURCES)[number];

export const ARTIFACT_KINDS = [
  'studio_front', 'studio_back', 'studio_left', 'studio_right',
  'studio_top', 'studio_bottom',
  'label_front', 'label_back', 'batch_template', 'hologram',
  'box_face', 'blister_pack', 'insert', 'reseller_mark', 'qr_code_sample',
] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export const TAKEDOWN_MECHANISMS = [
  'amazon_brand_registry',
  'ebay_vero',
  'walmart_seller_protection',
  'etsy_ip_policy',
  'dmca_takedown',
  'platform_trust_safety',
  'manual_legal',
] as const;
export type TakedownMechanism = (typeof TAKEDOWN_MECHANISMS)[number];

// ─── Reference corpus ───────────────────────────────────────────────────────

export interface ReferenceCorpusEntry {
  id: string;
  sku: string;
  artifactKind: ArtifactKind;
  version: string;
  storageKey: string;
  sha256: string;
  perceptualHash: string;
  approved: boolean;
  retired: boolean;
}

// ─── Vision input / output ──────────────────────────────────────────────────

export interface VisionInput {
  suspectImageBytes: Uint8Array;
  suspectImageStorageKey: string;
  candidateSkus: readonly string[];
  referenceImages: readonly ReferenceForVision[];
  ocrExtractedText: readonly string[];
  phiRedacted: boolean;
}

export interface ReferenceForVision {
  storageKey: string;
  sku: string;
  artifactKind: ArtifactKind;
  version: string;
  bytes: Uint8Array;
}

export interface FeatureObservation {
  feature: string;
  reference_image: string;
  observation: 'present' | 'absent' | 'illegible';
  match: 'geometry_match' | 'format_match' | 'color_match'
       | 'mismatch' | 'format_mismatch' | 'color_mismatch'
       | 'unknown';
  note: string;
}

export interface OcrCrossCheck {
  extracted_text: readonly string[];
  expected_text_present: readonly string[];
  expected_text_missing: readonly string[];
  unexpected_text: readonly string[];
}

export interface ImageCharacteristics {
  subject_is_product: boolean;
  primary_subject_face_like: boolean;
  resolution_adequate: boolean;
  lighting_quality: 'good' | 'fair' | 'poor';
  angle: string;
  occlusions: readonly string[];
  perceptual_hash_exact_match?: boolean;
}

export interface ContentSafety {
  skip: boolean;
  reason: 'face' | 'medical' | 'unrelated' | 'injection_attempt' | null;
}

/**
 * The structured JSON schema the vision model must return. Any deviation is
 * rejected by schema validation and logged as a possible injection attempt.
 */
export interface MarshallVisionOutput {
  evaluation_id: string;
  candidate_skus: readonly string[];
  image_characteristics: ImageCharacteristics;
  feature_observations: readonly FeatureObservation[];
  ocr_cross_check: OcrCrossCheck;
  summary_flags: readonly string[];
  content_safety: ContentSafety;
  model_version: string;
  reference_corpus_version: string;
}

// ─── Determination (deterministic verdict from rule table) ──────────────────

export interface ReasoningTraceEntry {
  feature: string;
  reference_image?: string;
  observation: string;
  match: string;
  note: string;
}

export interface Determination {
  evaluationId: string;
  verdict: Verdict;
  confidence: number;
  matchedSku: string | null;
  mismatchFlags: readonly string[];
  reasoningTrace: readonly ReasoningTraceEntry[];
  citedReferenceIds: readonly string[];
  humanReviewRequired: boolean;
}

// ─── Evaluation persistence row ─────────────────────────────────────────────

export interface EvaluationRecord {
  evaluationId: string;
  source: EvaluationSource;
  sourceReference: Record<string, unknown>;
  imageStorageKey: string;
  imageSha256: string;
  imagePerceptualHash: string;
  phiRedacted: boolean;
  contentSafetySkip: boolean;
  contentSafetyReason: string | null;
  candidateSkus: readonly string[];
  modelVersion: string;
  referenceCorpusVersion: string;
  rawVisionOutput: MarshallVisionOutput | null;
  ocrOutput: Record<string, unknown> | null;
  durationMs: number;
}

// ─── Kill-switch config ─────────────────────────────────────────────────────

export type VisionMode = 'active' | 'shadow' | 'off';

export interface VisionConfigSnapshot {
  mode: VisionMode;
  sourceEnabled: Record<EvaluationSource, boolean>;
  takedownEnabled: Record<TakedownMechanism, boolean>;
  rateLimitDailyCapPerSource: number;
  rateLimitPerPractitionerDaily: number;
  rateLimitPerConsumerDaily: number;
}

// ─── PHI redaction result ───────────────────────────────────────────────────

export interface PhiRedactResult {
  bytes: Uint8Array;
  redacted: boolean;
  detectedPatterns: readonly string[];
  note: string;
}

// ─── Normalization result ───────────────────────────────────────────────────

export interface NormalizedImage {
  bytes: Uint8Array;          // sRGB JPEG, longest edge <= 2048
  contentType: 'image/jpeg';
  sha256: string;
  perceptualHash: string;
  widthPx: number;
  heightPx: number;
  resolutionAdequate: boolean;
  exifStripped: boolean;
}
