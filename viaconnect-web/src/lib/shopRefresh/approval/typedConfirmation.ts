// Prompt #106 §3.5 — typed-confirmation validators.
//
// Bulk image URL updates, gap-fill publication, retirement, and primary
// image swaps all require the user to type an exact phrase. Matching is
// case-sensitive and strict — no trimming, no collapsing whitespace.
// Mirrors the CEO-issue pattern established in Prompt #105 §3.7.

import { TYPED_CONFIRMATION_PHRASES } from '../types';

export function validateBulkImageRefreshConfirmation(input: string): boolean {
  return input === TYPED_CONFIRMATION_PHRASES.BULK_IMAGE_REFRESH;
}

export function validatePublishBatchConfirmation(input: string, skuCount: number): boolean {
  if (!Number.isInteger(skuCount) || skuCount <= 0) return false;
  const expected = `${TYPED_CONFIRMATION_PHRASES.PUBLISH_BATCH_PREFIX} ${skuCount} SKUS`;
  return input === expected;
}

export function validateRetirementConfirmation(input: string): boolean {
  return input === TYPED_CONFIRMATION_PHRASES.RETIREMENT;
}

export function validatePrimarySwapConfirmation(input: string): boolean {
  return input === TYPED_CONFIRMATION_PHRASES.PRIMARY_SWAP;
}

/**
 * Retirement ALSO requires a reason string of at least 20 chars per §3.5
 * and the CHECK constraint on shop_refresh_reconciliation_findings.
 */
export function validateRetirementReason(reason: string | null | undefined): boolean {
  if (!reason) return false;
  return reason.trim().length >= 20;
}
