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

export interface PeptideHonestyCounts {
  trialsRegistered: number | string | null;
  trialsCompleted: number | string | null;
  trialsWithResultsPosted: number | string | null;
  publicationsHuman: number | string | null;
}

/** Consumer monograph: educational fields only. No dose, reconstitution, or commerce. */
export interface ConsumerPeptideMonograph extends EducationPeptide {
  mechanismDetail: string;
  evidenceSummary: string;
  provenanceDisclosure: string;
  preparationClass: string;
  halfLifeClass: string;
  honesty: PeptideHonestyCounts;
}

export function isSafePeptideSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,80}$/i.test(slug);
}

function asHonestyCount(value: unknown): number | string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

export function parseHonestyLayer(raw: unknown): PeptideHonestyCounts {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      trialsRegistered: null,
      trialsCompleted: null,
      trialsWithResultsPosted: null,
      publicationsHuman: null,
    };
  }
  const row = raw as Record<string, unknown>;
  return {
    trialsRegistered: asHonestyCount(row.trials_registered),
    trialsCompleted: asHonestyCount(row.trials_completed),
    trialsWithResultsPosted: asHonestyCount(row.trials_with_results_posted),
    publicationsHuman: asHonestyCount(row.publications_human),
  };
}

export function gradeToBadge(grade: string): 'strong' | 'moderate' | 'emerging' {
  if (grade === 'A' || grade === 'B') return 'strong';
  if (grade === 'C') return 'moderate';
  return 'emerging';
}
