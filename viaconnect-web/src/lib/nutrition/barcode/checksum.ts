/**
 * Prompt 170l Phase 1c-1: barcode checksum validation.
 *
 * Validates EAN-13 / UPC-A / EAN-8 / ITF-14 per GS1's GTIN check-digit
 * algorithm. The algorithm differs by length but the structure is identical:
 * weight each non-check digit by 1 or 3 (alternating from the right), sum,
 * mod 10, the check digit is (10 - sum mod 10) mod 10.
 *
 * Used by:
 *   - /api/nutrition/barcode/lookup route (server-side; rejects invalid input
 *     before consuming the OFF rate-limit budget)
 *   - §11.6 manual barcode entry modal (client-side; live inline feedback as
 *     the user types)
 */

import type { BarcodeFormat } from './types';

export interface BarcodeValidationResult {
  valid: boolean;
  format: BarcodeFormat | null;
  reason?: 'wrong_length' | 'non_numeric' | 'checksum_mismatch';
}

/**
 * Validates a barcode string. Returns the format on success or a reason on
 * failure. Length determines format candidate; checksum confirms validity.
 *
 * Supported lengths: 8 (EAN-8), 12 (UPC-A), 13 (EAN-13), 14 (ITF-14).
 */
export function validateBarcode(input: string): BarcodeValidationResult {
  if (typeof input !== 'string') {
    return { valid: false, format: null, reason: 'non_numeric' };
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { valid: false, format: null, reason: 'wrong_length' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, format: null, reason: 'non_numeric' };
  }

  const candidate = formatForLength(trimmed.length);
  if (candidate === null) {
    return { valid: false, format: null, reason: 'wrong_length' };
  }

  if (!hasValidChecksum(trimmed)) {
    return { valid: false, format: null, reason: 'checksum_mismatch' };
  }

  return { valid: true, format: candidate };
}

function formatForLength(length: number): BarcodeFormat | null {
  switch (length) {
    case 8: return 'EAN_8';
    case 12: return 'UPC_A';
    case 13: return 'EAN_13';
    case 14: return 'ITF_14';
    default: return null;
  }
}

/**
 * GTIN check-digit algorithm. From rightmost non-check digit, weight 3, then
 * 1, alternating. Sum, mod 10, check digit = (10 - mod) mod 10.
 *
 * Reference: GS1 General Specifications section 7.9.
 */
function hasValidChecksum(digits: string): boolean {
  const n = digits.length;
  let sum = 0;
  for (let i = 0; i < n - 1; i++) {
    const digit = digits.charCodeAt(n - 2 - i) - 48; // n-2-i = right-to-left ignoring the check digit
    const weight = i % 2 === 0 ? 3 : 1;
    sum += digit * weight;
  }
  const expectedCheck = (10 - (sum % 10)) % 10;
  const actualCheck = digits.charCodeAt(n - 1) - 48;
  return expectedCheck === actualCheck;
}
