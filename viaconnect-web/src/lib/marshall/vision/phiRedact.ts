// Prompt #124 P1: PHI pre-filter.
//
// Consumer-submitted photos may include prescription labels with patient
// identifiers (name, DOB, RX#, DEA#, address). Before any image enters the
// vision evaluation path, it passes through this filter:
//   1. OCR-lite pattern scan on the normalized image.
//   2. If prescription-label patterns detected → apply a sharp-based blur
//      across the whole image and set phi_redacted = true.
//   3. Downstream collectors receive the redacted image and evidence is
//      tagged "PHI redacted from source image before evaluation."
//
// Pattern-matching philosophy: false positives preferred over false negatives.
// A benign photo that gets blurred is a minor inconvenience; a prescription
// label that survives is a privacy breach.
//
// Implementation constraint: we cannot do per-region redaction without a real
// OCR pass (that's P2 after Google Cloud Vision lands). For P1 the approach
// is "whole-image blur on any match" — the resulting image is still usable
// for vision evaluation because the blurred version preserves packaging
// silhouette, cap geometry, color, and other coarse features while
// destroying small-type PHI text.

import sharp from 'sharp';
import type { PhiRedactResult } from './types';

/**
 * Patterns that indicate a prescription / medical label. Any single hit
 * triggers redaction — this is the intentional design choice.
 *
 * The patterns here are applied BEFORE real OCR; they match against strings
 * that a caller may have already extracted (from a sidecar OCR, upstream
 * metadata, or a filename). The whole-image blur runs regardless of text
 * source so that if OCR misses the region, the image is still neutralized.
 */
export const PHI_PATTERNS: ReadonlyArray<{ name: string; regex: RegExp }> = [
  { name: 'rx_number',       regex: /\b(?:RX|Rx)\s*#?\s*:?\s*\d{4,}/ },
  { name: 'dea_number',      regex: /\b(?:DEA|DEA#|DEA\s?No\.?)\s*[:\s]*[A-Z]{2}\s?\d{7}\b/ },
  { name: 'dob_label',       regex: /\b(?:DOB|D\.O\.B\.|Date of Birth)\b[:\s]*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/i },
  { name: 'patient_label',   regex: /\b(?:Patient|Pt\.?)\s*(?:Name)?\s*:/ },
  { name: 'prescriber',      regex: /\b(?:Prescriber|Dr\.?|M\.D\.|MD\b|D\.O\.|DO\b)\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+/ },
  { name: 'mrn',             regex: /\b(?:MRN|Medical Record(?:\s*No\.?)?)\s*[:#]?\s*\d{4,}/i },
  { name: 'refills_label',   regex: /\bRefills?\s*[:]\s*\d+/i },
  { name: 'ndc_with_name',   regex: /\bNDC\s*#?\s*\d{4,5}-\d{3,4}-\d{1,2}\b/i },
  { name: 'pharmacy_fill',   regex: /\bFill(?:ed)?\s*Date\s*[:]\s*\d{1,2}[\/\-\.]\d{1,2}/i },
  // Added P5 before consumer intake per Jeffery's P1 forward-log note:
  { name: 'npi',             regex: /\b(?:NPI|National Provider Id(?:entifier)?)\s*[:#]?\s*\d{10}\b/i },
  { name: 'address_label',   regex: /\b\d+\s+[A-Za-z][A-Za-z\s]*(?:Street|St\.?|Avenue|Ave\.?|Boulevard|Blvd\.?|Road|Rd\.?|Lane|Ln\.?|Drive|Dr\.?|Court|Ct\.?|Way|Circle|Cir\.?)\b/ },
  { name: 'phone_label',     regex: /\b(?:Ph|Phone|Tel|Telephone|Fax)\s*[:#]?\s*(?:\+?\d{1,3}[\s.\-]?)?\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}\b/i },
  { name: 'email_label',     regex: /\b(?:Email|E\-mail)\s*[:#]?\s*[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/i },
];

export interface PhiInput {
  bytes: Uint8Array;
  /** Optional pre-extracted text (e.g. a sidecar OCR pass, filename). */
  extractedText?: readonly string[];
}

/**
 * Scan + redact. If any PHI pattern matches, apply a blur across the entire
 * image and return `redacted: true`. Otherwise return the input bytes
 * unchanged with `redacted: false`.
 */
export async function redactPhi(input: PhiInput): Promise<PhiRedactResult> {
  const text = (input.extractedText ?? []).join('\n');
  const hits = scanForPhi(text);

  if (hits.length === 0) {
    return {
      bytes: input.bytes,
      redacted: false,
      detectedPatterns: [],
      note: 'no PHI patterns detected in pre-scan',
    };
  }

  // Apply a conservative Gaussian blur. Sigma 8 destroys small-font text
  // reliably while preserving coarse packaging shape.
  const blurred = await sharp(input.bytes)
    .blur(8)
    .jpeg({ quality: 88 })
    .toBuffer();

  return {
    bytes: new Uint8Array(blurred),
    redacted: true,
    detectedPatterns: hits,
    note: `PHI redacted: patterns matched [${hits.join(', ')}]; whole-image blur applied`,
  };
}

/** Check a text blob for any PHI pattern; returns the list of pattern names that hit. */
export function scanForPhi(text: string): string[] {
  const hits: string[] = [];
  for (const p of PHI_PATTERNS) {
    if (p.regex.test(text)) {
      hits.push(p.name);
    }
  }
  return hits;
}

/**
 * Opinionated helper: did a block of text almost-certainly originate from a
 * prescription label? Two or more distinct PHI patterns in the same text
 * dramatically raises confidence — used to escalate treatment beyond a
 * simple blur (e.g., refusing to store the source image at all).
 */
export function isStronglyPhiLike(text: string): boolean {
  return scanForPhi(text).length >= 2;
}
