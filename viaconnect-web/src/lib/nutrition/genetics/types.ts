// Prompt 187 Task 2: shared types for the Nutrition by Genetics page.
//
// Source of truth is the live database schema (already applied):
//   public.nutrition_genetic_findings (owner-only SELECT; edge function writes)
//   public.nutrition_test_uploads    (owner select/insert/update)
// The string literal unions below mirror those tables' CHECK constraints
// exactly. Do not add values here without a matching migration.

/** nutrition_genetic_findings.source CHECK values. */
export type FindingSource = 'nutrigendx' | 'uploaded_test';

/** nutrition_genetic_findings.category CHECK values. */
export type FindingCategory = 'food' | 'vitamin' | 'mineral' | 'other';

/** nutrition_genetic_findings.direction CHECK values. */
export type FindingDirection = 'need' | 'avoid' | 'neutral' | 'unknown';

/** nutrition_genetic_findings.strength CHECK values. */
export type FindingStrength = 'strong' | 'moderate' | 'weak';

/** nutrition_genetic_findings.confidence CHECK values. */
export type FindingConfidence = 'high' | 'medium' | 'low';

/** nutrition_test_uploads.status CHECK values. */
export type UploadStatus = 'uploaded' | 'analyzing' | 'analyzed' | 'failed';

/** camelCase mapping of a public.nutrition_genetic_findings row. */
export interface NutritionGeneticFinding {
  id: string;
  userId: string;
  source: FindingSource;
  sourceRefId: string;
  category: FindingCategory;
  itemName: string;
  itemSlug: string;
  direction: FindingDirection;
  strength: FindingStrength;
  confidence: FindingConfidence;
  estimated: boolean;
  rationale: string | null;
  createdAt: string;
  supersededAt: string | null;
}

/** camelCase mapping of a public.nutrition_test_uploads row. */
export interface NutritionTestUpload {
  id: string;
  userId: string;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  sourceCompany: string | null;
  status: UploadStatus;
  failureReason: string | null;
  createdAt: string;
  analyzedAt: string | null;
}

// ---------------------------------------------------------------------------
// Prompt 188 contract: NutrigenDxResultSet.
//
// Prompt 188 (NutrigenDX panel ingestion) implements against this contract;
// it is exported from 187 so both prompts share one shape. NO real marker
// data is rendered in 187: the 187 surfaces consume only the normalized
// `findings` array, and `markers` exists solely so 188 can populate the AI
// Results panel later. Field names must not change without coordinating
// with Prompt 188.
// ---------------------------------------------------------------------------

/**
 * The unified finding shape every analysis source produces (NutrigenDX panel
 * normalization in 188, Hannah upload analysis via the edge function).
 * Matches the writable subset of nutrition_genetic_findings.
 */
export interface NutritionFindingInput {
  category: FindingCategory;
  itemName: string;
  itemSlug: string;
  direction: FindingDirection;
  strength: FindingStrength;
  confidence: FindingConfidence;
  estimated: boolean;
  rationale: string | null;
}

/** One genetic marker on a NutrigenDX panel result. */
export interface NutrigenDxMarker {
  gene: string;
  rsid: string;
  genotype: string;
  category: FindingCategory;
  impactSummary: string;
  confidence: FindingConfidence;
}

export interface NutrigenDxResultSet {
  panelId: string;
  /** ISO date the sample was collected; null when the panel omits it. */
  collectedDate: string | null;
  /** ISO date the lab processed the panel; null when the panel omits it. */
  processedDate: string | null;
  markers: NutrigenDxMarker[];
  /** Normalized findings derived from the markers, in the unified shape. */
  findings: NutritionFindingInput[];
}

// ---------------------------------------------------------------------------
// Row-to-type mappers. Defensive by design: rows arrive as untyped JSON from
// the client read, so the mappers tolerate unknown or extra fields, coerce
// primitives to strings, and fall back to the most conservative enum value
// (the one claiming the least certainty) rather than throwing. They NEVER
// throw.
// ---------------------------------------------------------------------------

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

const FINDING_SOURCES: readonly FindingSource[] = ['nutrigendx', 'uploaded_test'];
const FINDING_CATEGORIES: readonly FindingCategory[] = ['food', 'vitamin', 'mineral', 'other'];
const FINDING_DIRECTIONS: readonly FindingDirection[] = ['need', 'avoid', 'neutral', 'unknown'];
const FINDING_STRENGTHS: readonly FindingStrength[] = ['strong', 'moderate', 'weak'];
const FINDING_CONFIDENCES: readonly FindingConfidence[] = ['high', 'medium', 'low'];
const UPLOAD_STATUSES: readonly UploadStatus[] = ['uploaded', 'analyzing', 'analyzed', 'failed'];

export function findingFromRow(row: Record<string, unknown>): NutritionGeneticFinding {
  return {
    id: asString(row.id),
    userId: asString(row.user_id),
    // Unknown source falls back to uploaded_test so a malformed row can never
    // claim nutrigendx precedence in applySourcePrecedence.
    source: oneOf(row.source, FINDING_SOURCES, 'uploaded_test'),
    sourceRefId: asString(row.source_ref_id),
    category: oneOf(row.category, FINDING_CATEGORIES, 'other'),
    itemName: asString(row.item_name),
    itemSlug: asString(row.item_slug),
    direction: oneOf(row.direction, FINDING_DIRECTIONS, 'unknown'),
    strength: oneOf(row.strength, FINDING_STRENGTHS, 'weak'),
    confidence: oneOf(row.confidence, FINDING_CONFIDENCES, 'low'),
    // A missing flag falls back to true: claiming a finding is estimated
    // understates certainty, which is the safe direction.
    estimated: asBoolean(row.estimated, true),
    rationale: asNullableString(row.rationale),
    createdAt: asString(row.created_at),
    supersededAt: asNullableString(row.superseded_at),
  };
}

export function uploadFromRow(row: Record<string, unknown>): NutritionTestUpload {
  return {
    id: asString(row.id),
    userId: asString(row.user_id),
    storagePath: asString(row.storage_path),
    originalFilename: asString(row.original_filename),
    mimeType: asString(row.mime_type),
    fileSizeBytes: asNumber(row.file_size_bytes),
    sourceCompany: asNullableString(row.source_company),
    // Unknown status falls back to uploaded, the neutral initial state, so a
    // malformed row never fakes a completed or failed analysis.
    status: oneOf(row.status, UPLOAD_STATUSES, 'uploaded'),
    failureReason: asNullableString(row.failure_reason),
    createdAt: asString(row.created_at),
    analyzedAt: asNullableString(row.analyzed_at),
  };
}
