// Brief 16 SSOT: genetics uploaded is one rule for hub, BOS, and supplements.
//
// uploaded     = at least one non-sample user_variants row, or a real kit ingest
// sample_only  = Demo chips only; not uploaded for BOS / supplements
// none         = Unanalyzed / honest empty
//
// Legacy null is_sample counts as real (same as qualifiedVariants).
// Sample seed writes is_sample=true and a filename-less dna_uploads row;
// that upload is not a real kit ingest.
// No SNP math lives here.

export type GeneticsUploadState = 'uploaded' | 'sample_only' | 'none';

export interface GeneticsUploadVariantFact {
  is_sample?: boolean | null;
  /** Stored alias only. Display maps genex_m / GENEX-M / methylation / reference to GeneXM. */
  panel_key?: string | null;
}

export interface GeneticsUploadFacts {
  variantRows: ReadonlyArray<GeneticsUploadVariantFact>;
  realKitIngest?: boolean;
  /** Successful empty is none. A failed read is not a 0-row account. */
  variantsReadFailed?: boolean;
}

export function isRealVariantRow(row: GeneticsUploadVariantFact): boolean {
  return row.is_sample !== true;
}

export function resolveGeneticsUploadState(
  facts: GeneticsUploadFacts,
): GeneticsUploadState {
  const hasRealVariant = facts.variantRows.some(isRealVariantRow);
  if (hasRealVariant || facts.realKitIngest === true) return 'uploaded';
  if (facts.variantRows.some((row) => row.is_sample === true)) return 'sample_only';
  return 'none';
}

export function isGeneticsUploaded(state: GeneticsUploadState): boolean {
  return state === 'uploaded';
}

export function hubHeaderBadge(args: {
  isLoading: boolean;
  loadFailed: boolean;
  uploadState: GeneticsUploadState;
  totalVariants: number | null;
}): string {
  if (args.isLoading) return 'Loading';
  // Fail / 401 / null stay Unanalyzed. Honest empty after a successful read may show 0.
  if (args.loadFailed || args.totalVariants === null) return 'Unanalyzed';
  if (args.uploadState === 'sample_only') return `${args.totalVariants} Demo`;
  return `${args.totalVariants} results`;
}

export const SUPPLEMENTS_GENETICS_NOT_UPLOADED =
  'Your personalized genetics-based protocol will appear here once genetic data is uploaded and clinically-published guidance is available for your variants.';

export const SUPPLEMENTS_GENETICS_UPLOADED_NO_PROTOCOL =
  'Clinically published guidance for your variants is not on this protocol yet. Your CAQ AI protocol is already active.';

export function supplementsGeneticsEmptyCopy(uploaded: boolean): string {
  return uploaded
    ? SUPPLEMENTS_GENETICS_UPLOADED_NO_PROTOCOL
    : SUPPLEMENTS_GENETICS_NOT_UPLOADED;
}

export function isRealKitUploadFilename(
  sourceFilename: string | null | undefined,
): boolean {
  return typeof sourceFilename === 'string' && sourceFilename.trim().length > 0;
}
