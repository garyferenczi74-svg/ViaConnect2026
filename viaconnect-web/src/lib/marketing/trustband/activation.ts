/**
 * Activation gate validators for the trust band surfaces (Prompt #138c).
 *
 * Each surface has a different invariant:
 *   regulatory_paragraph: marshall_precheck_passed + steve_approval_at
 *   clinician_card:       above + clinician_consent_storage_key
 *   trust_chip:           same as regulatory_paragraph
 *   testimonial:          above + legal_counsel_review_at + consent not revoked
 *
 * Mirrors the DB CHECK constraints from the migration so admin UI can
 * fail-fast before issuing UPDATEs that would be DB-rejected. The DB is
 * the source of truth; these helpers exist for UX, not security.
 */

import type {
  RegulatoryParagraphRow,
  ClinicianCardRow,
  TrustChipRow,
  TestimonialRow,
} from "./types";

export interface ActivationResult {
  ok: boolean;
  reasons: string[];
}

export function canActivateRegulatoryParagraph(
  row: Pick<RegulatoryParagraphRow, "marshall_precheck_passed" | "steve_approval_at" | "archived">,
): ActivationResult {
  const reasons: string[] = [];
  if (!row.marshall_precheck_passed) reasons.push("Marshall pre-check has not passed.");
  if (!row.steve_approval_at) reasons.push("Steve approval is missing.");
  if (row.archived) reasons.push("Row is archived.");
  return { ok: reasons.length === 0, reasons };
}

export function canActivateClinicianCard(
  row: Pick<
    ClinicianCardRow,
    | "marshall_precheck_passed"
    | "steve_approval_at"
    | "archived"
    | "clinician_consent_storage_key"
  >,
): ActivationResult {
  const reasons: string[] = [];
  if (!row.marshall_precheck_passed) reasons.push("Marshall pre-check has not passed.");
  if (!row.steve_approval_at) reasons.push("Steve approval is missing.");
  if (row.archived) reasons.push("Row is archived.");
  if (!row.clinician_consent_storage_key) {
    reasons.push("Written clinician consent is not on file.");
  }
  return { ok: reasons.length === 0, reasons };
}

export function canActivateChip(
  row: Pick<TrustChipRow, "marshall_precheck_passed" | "steve_approval_at" | "archived">,
): ActivationResult {
  const reasons: string[] = [];
  if (!row.marshall_precheck_passed) reasons.push("Marshall pre-check has not passed.");
  if (!row.steve_approval_at) reasons.push("Steve approval is missing.");
  if (row.archived) reasons.push("Row is archived.");
  return { ok: reasons.length === 0, reasons };
}

export function canActivateTestimonial(
  row: Pick<
    TestimonialRow,
    | "marshall_precheck_passed"
    | "steve_approval_at"
    | "legal_counsel_review_at"
    | "archived"
    | "endorser_consent_revoked_at"
    | "endorser_written_consent_storage_key"
  >,
): ActivationResult {
  const reasons: string[] = [];
  if (!row.marshall_precheck_passed) reasons.push("Marshall pre-check has not passed.");
  if (!row.steve_approval_at) reasons.push("Steve approval is missing.");
  if (!row.legal_counsel_review_at) reasons.push("Legal counsel review is missing.");
  if (row.archived) reasons.push("Row is archived.");
  if (row.endorser_consent_revoked_at) reasons.push("Endorser consent has been revoked.");
  if (!row.endorser_written_consent_storage_key) {
    reasons.push("Written endorser consent is not on file.");
  }
  return { ok: reasons.length === 0, reasons };
}
