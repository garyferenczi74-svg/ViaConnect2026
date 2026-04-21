// Photo Sync prompt: shared types for the audit + sync pipeline.

export const SUPABASE_PROJECT_HOST = 'nnhkcufyqjojdbvdrpky.supabase.co';
export const PHOTO_BUCKET = 'supplement-photos';
export const PUBLIC_PREFIX = `https://${SUPABASE_PROJECT_HOST}/storage/v1/object/public/${PHOTO_BUCKET}/`;

export type ImageUrlClassification =
  | 'VALID_SUPABASE'
  | 'STALE_SUPABASE'
  | 'PLACEHOLDER'
  | 'EXTERNAL'
  | 'NULL';

export type MatchConfidence = 'HIGH' | 'LOW' | 'NONE';

export interface ProductRow {
  id: string;
  sku: string;
  slug: string | null;             // optional (live schema may not have it)
  name: string;
  category: string | null;
  product_type: string | null;     // optional (derived from pricing_tier when missing)
  image_url: string | null;
  updated_at: string | null;
}

export interface ProductVariantRow {
  id: string;
  parent_product_id: string;
  sku: string;
  delivery_form: string | null;
  image_url: string | null;
}

export interface BucketObject {
  full_path: string;               // e.g. "snp-support-formulations/mthfr-plus-folate-metabolism.png"
  name: string;                    // e.g. "mthfr-plus-folate-metabolism.png"
  size_bytes: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

export interface BucketManifest {
  generated_at: string;
  total_objects: number;
  rejected_uploads: BucketObject[]; // 0-byte / oversize / bad mime
  objects: BucketObject[];
  normalized_keys: Record<string, string>;  // normalized_key -> full_path
}

export interface MatchPlanRow {
  product_id: string;
  variant_id: string | null;
  sku: string;
  display_name: string;
  category: string | null;
  current_image_url: string | null;
  current_classification: ImageUrlClassification;
  matched_full_path: string | null;
  matched_public_url: string | null;
  match_confidence: MatchConfidence;
  match_priority: 1 | 2 | 3 | 4 | 5 | null;
  match_source: string | null;     // e.g. "sku_exact", "fuzzy_lev=2"
  runners_up: ReadonlyArray<{ full_path: string; priority: number; source: string; distance?: number }>;
}

export interface MatchPlan {
  generated_at: string;
  total_products: number;
  already_valid: number;
  will_update: number;
  still_missing: number;
  external_skipped: number;
  rows: MatchPlanRow[];
}
