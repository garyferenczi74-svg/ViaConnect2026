// Prompt #106 — shop refresh shared types.
//
// Pure TypeScript contracts shared across libs, edge functions, and admin UI.
// No runtime imports here — keep this file dependency-free so every layer
// (Node, Deno edge, browser) can import it without a transform.

export const IN_SCOPE_CATEGORY_SLUGS = [
  'base-formulations',
  'advanced-formulations',
  'womens-health',
  'sproutables-childrens',
  'snp-support-formulations',
  'functional-mushrooms',
] as const;

export type InScopeCategorySlug = typeof IN_SCOPE_CATEGORY_SLUGS[number];

export const ALLOWED_CONTENT_TYPES = ['image/png', 'image/jpeg'] as const;
export type AllowedContentType = typeof ALLOWED_CONTENT_TYPES[number];

export const MIN_IMAGE_DIMENSION_PX = 800;
export const MAX_IMAGE_DIMENSION_PX = 4000;
export const MAX_IMAGE_BYTE_SIZE = 2 * 1024 * 1024;

export const CANONICAL_BUCKET = 'supplement-photos' as const;

export const TYPED_CONFIRMATION_PHRASES = {
  BULK_IMAGE_REFRESH: 'APPROVE IMAGE REFRESH',
  PUBLISH_BATCH_PREFIX: 'PUBLISH', // followed by " N SKUS"
  RETIREMENT: 'APPROVE RETIREMENT',
  PRIMARY_SWAP: 'APPROVE PRIMARY SWAP',
} as const;

export type ShopFindingType =
  | 'missing_in_catalog'
  | 'catalog_not_in_canonical'
  | 'mismatched_name'
  | 'mismatched_category'
  | 'mismatched_price';

export type ShopFindingResolution =
  | 'pending_review'
  | 'approved_to_insert'
  | 'approved_to_retire'
  | 'approved_to_correct'
  | 'rejected';

export interface CanonicalSkuRow {
  sku: string;
  name: string;
  category: string; // workbook spelling — normalized via categoryNormalizer
  msrp: number;
}

export interface CatalogRow {
  sku: string;
  name: string;
  category: string;
  price: number;
  image_url: string | null;
  active: boolean | null;
}

export interface ShopRefreshFindingPayload {
  findingType: ShopFindingType;
  sku: string;
  canonical: CanonicalSkuRow | null;
  catalog: CatalogRow | null;
}

export type ShopRefreshAuditCategory =
  | 'storage_upload' | 'storage_replace' | 'storage_archive'
  | 'binding_create' | 'binding_rebind' | 'binding_archive'
  | 'catalog_image_url_update' | 'catalog_row_insert' | 'catalog_active_toggle'
  | 'retirement_flag' | 'retirement_approve' | 'retirement_revert'
  | 'category_normalization' | 'sha256_verification_failure'
  | 'approval_typed_confirmation';
