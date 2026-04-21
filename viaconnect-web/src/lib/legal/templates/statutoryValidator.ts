// Prompt #104 Phase 1: Statutory-element validators.
//
// DMCA § 512(c)(3)(A) requires six elements for a takedown notice to
// be facially valid. The Lanham § 32 material-differences theory
// requires documented differences. These pure functions block draft
// generation until the case payload contains the required fields.

export interface DMCAStatutoryPayload {
  signature: string | null;
  copyrighted_work_identification: string | null;
  infringing_material_identification: string | null;
  contact_info: { email: string | null; phone: string | null } | null;
  good_faith_statement_present: boolean;
  perjury_statement_present: boolean;
}

export type DMCAStatutoryElement =
  | 'signature'                                    // (i)
  | 'copyrighted_work_identification'              // (ii)
  | 'infringing_material_identification'           // (iii)
  | 'contact_info'                                 // (iv)
  | 'good_faith_statement'                         // (v)
  | 'perjury_statement';                           // (vi)

export interface DMCAValidationResult {
  ok: boolean;
  missing: ReadonlyArray<DMCAStatutoryElement>;
}

const NON_EMPTY = (s: string | null | undefined): boolean => typeof s === 'string' && s.trim().length > 0;

export function validateDMCAStatutoryElements(p: DMCAStatutoryPayload): DMCAValidationResult {
  const missing: DMCAStatutoryElement[] = [];
  if (!NON_EMPTY(p.signature)) missing.push('signature');
  if (!NON_EMPTY(p.copyrighted_work_identification)) missing.push('copyrighted_work_identification');
  if (!NON_EMPTY(p.infringing_material_identification)) missing.push('infringing_material_identification');
  if (!p.contact_info || (!NON_EMPTY(p.contact_info.email) && !NON_EMPTY(p.contact_info.phone))) {
    missing.push('contact_info');
  }
  if (!p.good_faith_statement_present) missing.push('good_faith_statement');
  if (!p.perjury_statement_present) missing.push('perjury_statement');
  return { ok: missing.length === 0, missing };
}

// ---------------------------------------------------------------------------
// Lanham § 32 material-differences theory
// ---------------------------------------------------------------------------

export interface MaterialDifferencesPayload {
  documented_differences: ReadonlyArray<{
    category: 'warranty' | 'labeling' | 'safety_info' | 'formulation' | 'packaging' | 'expiration_handling' | 'other';
    description: string;
    evidence_id?: string;
  }>;
}

export interface MaterialDifferencesValidationResult {
  ok: boolean;
  reason?: 'no_differences_documented' | 'differences_lack_descriptions';
}

export function validateMaterialDifferences(p: MaterialDifferencesPayload): MaterialDifferencesValidationResult {
  if (!p.documented_differences || p.documented_differences.length < 1) {
    return { ok: false, reason: 'no_differences_documented' };
  }
  const allDescribed = p.documented_differences.every((d) => NON_EMPTY(d.description));
  if (!allDescribed) return { ok: false, reason: 'differences_lack_descriptions' };
  return { ok: true };
}
