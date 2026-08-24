/**
 * Prompt 225: education-only peptide card model.
 * Intentionally omits dose, reconstitution, cycle, price, and commerce fields.
 */

export type PeptideExclusionTier =
  | 'educational'
  | 'restricted'
  | 'excluded_adverse_reference';

export interface EducationPeptide {
  slug: string;
  displayName: string;
  canonicalName: string;
  molecularClass: string;
  isPeptide: boolean;
  category: string;
  mechanismSummary: string;
  evidenceGrade: string;
  exclusionTier: PeptideExclusionTier;
  misconceptionNotes: string;
  wadaStatus: string;
  humanDataExists: boolean;
}

export interface EducationPeptideCategory {
  id: string;
  label: string;
  peptides: EducationPeptide[];
}

export function gradeToBadge(grade: string): 'strong' | 'moderate' | 'emerging' {
  if (grade === 'A' || grade === 'B') return 'strong';
  if (grade === 'C') return 'moderate';
  return 'emerging';
}
